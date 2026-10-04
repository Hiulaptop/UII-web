"use server";

import { revalidatePath } from "next/cache";
import { auth, sessionUsers, signOut } from "@/auth";
import { confirmationMatches } from "@/lib/account/confirm";
import { deleteAccount, revokeAllSosLinks } from "@/lib/account/service";

export type SettingsState = { ok?: boolean; message?: string; error?: string } | null;

async function requireUser() {
  const s = await auth();
  const id = s?.user?.id;
  const email = s?.user?.email;
  if (!id || !email) throw new Error("Unauthenticated");
  return { id, email };
}

export async function revokeAllSosLinksAction(): Promise<SettingsState> {
  const u = await requireUser();
  const n = await revokeAllSosLinks(u.id);
  revalidatePath("/profile/qr");
  return { ok: true, message: n ? `Đã thu hồi ${n} liên kết.` : "Không có liên kết nào đang hoạt động." };
}

export async function deleteAccountAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const u = await requireUser();
  if (!confirmationMatches(formData.get("confirm"), u.email)) return { error: "Email xác nhận chưa đúng." };
  await deleteAccount(u.id);
  sessionUsers.forget(u.id);
  // The session cookie would otherwise outlive the user row; signing out also redirects.
  await signOut({ redirectTo: "/login" });
  return { ok: true };
}
