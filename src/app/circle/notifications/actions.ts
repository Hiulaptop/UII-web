"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { savePrefs } from "@/lib/notify/prefs";
import { parsePrefsForm } from "@/lib/notify/prefs-schema";

export type PrefsState = { ok?: boolean; error?: string } | null;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function savePrefsAction(_prev: PrefsState, formData: FormData): Promise<PrefsState> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) throw new Error("Unauthenticated");
  const circleId = formData.get("circleId");
  if (typeof circleId !== "string" || !UUID_RE.test(circleId)) return { error: "Dữ liệu không hợp lệ." };
  const parsed = parsePrefsForm(formData);
  if (!parsed.success) return { error: "Chọn ít nhất một kênh và một loại cảnh báo; giờ yên lặng cần cả giờ bắt đầu và kết thúc." };
  if (!(await savePrefs(uid, circleId, parsed.data))) return { error: "Bạn không còn trong circle này." };
  revalidatePath("/circle/notifications");
  return { ok: true };
}
