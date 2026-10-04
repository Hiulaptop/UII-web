"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { parseScheduleForm } from "@/lib/medication/schedule";
import { removeFor, syncOne } from "@/lib/google/calendar-service";
import { deleteSchedule, getSchedule, markTaken, saveSchedule } from "@/lib/medication/service";

export type ScheduleState = { error?: string } | null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

async function requireUserId() {
  const id = (await auth())?.user?.id;
  if (!id) throw new Error("Unauthenticated");
  return id;
}

export async function saveScheduleAction(_prev: ScheduleState, formData: FormData): Promise<ScheduleState> {
  const uid = await requireUserId();
  const parsed = parseScheduleForm(formData);
  if (!parsed.success) return { error: "Kiểm tra lại: cần tên thuốc, ít nhất một giờ uống, một ngày trong tuần và ngày hợp lệ (kết thúc không trước ngày bắt đầu)." };
  const rawId = formData.get("id");
  const id = typeof rawId === "string" && UUID_RE.test(rawId) ? rawId : null;
  const r = await saveSchedule(uid, id, parsed.data);
  if (!r.ok) return { error: r.error === "limit" ? "Bạn đã có tối đa 20 lịch thuốc." : "Không tìm thấy lịch này." };
  // The schedule is saved either way; the calendar follows, and a failure is shown rather than hidden.
  const sync = await syncOne(uid, r.id);
  revalidatePath("/profile/medications");
  redirect(sync.ok || sync.error === "not_connected" ? "/profile/medications" : "/profile/medications?sync=failed");
}

export async function deleteScheduleAction(formData: FormData) {
  const uid = await requireUserId();
  const id = formData.get("id");
  if (typeof id !== "string" || !UUID_RE.test(id)) throw new Error("Invalid id");
  const existing = await getSchedule(uid, id);
  if (existing) await removeFor(uid, existing);
  await deleteSchedule(uid, id);
  revalidatePath("/profile/medications");
}

export async function markTakenAction(formData: FormData) {
  const uid = await requireUserId();
  const id = formData.get("id");
  const time = formData.get("time");
  if (typeof id !== "string" || !UUID_RE.test(id) || typeof time !== "string" || !TIME_RE.test(time)) throw new Error("Invalid request");
  await markTaken(uid, id, time);
  revalidatePath("/profile/medications");
}
