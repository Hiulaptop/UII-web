"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { disconnect, syncAll } from "@/lib/google/calendar-service";

async function requireUserId() {
  const id = (await auth())?.user?.id;
  if (!id) throw new Error("Unauthenticated");
  return id;
}

export async function resyncAction() {
  const uid = await requireUserId();
  await syncAll(uid);
  revalidatePath("/settings/google");
}

export async function disconnectAction(formData: FormData) {
  const uid = await requireUserId();
  await disconnect(uid, formData.get("delete_calendar") === "on");
  revalidatePath("/settings/google");
  revalidatePath("/profile/medications");
}
