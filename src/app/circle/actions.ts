"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createInvite, removeMember, revokeInvite, setReportPermission, type HistoryChoice } from "@/lib/invites";
import type { CircleRole } from "@/lib/labels";

export type InviteState = { error?: string; link?: string; email?: string } | null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUser() {
  const session = await auth();
  const id = session?.user?.id;
  const email = session?.user?.email;
  if (!id || !email) throw new Error("Unauthenticated");
  return { id, email };
}

function uuidField(formData: FormData, name: string) {
  const v = formData.get(name);
  if (typeof v !== "string" || !UUID_RE.test(v)) throw new Error(`Invalid ${name}`);
  return v;
}

export async function createInviteAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const user = await requireUser();
  const result = await createInvite({
    ownerId: user.id,
    ownerEmail: user.email,
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? "") as CircleRole,
    history: String(formData.get("history") ?? "") as HistoryChoice,
    allowReports: formData.get("allow_reports") === "on",
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/circle");
  return { link: result.link, email: result.email };
}

export async function revokeInviteAction(formData: FormData) {
  const user = await requireUser();
  await revokeInvite(user.id, uuidField(formData, "inviteId"));
  revalidatePath("/circle");
}

export async function setReportPermissionAction(formData: FormData) {
  const user = await requireUser();
  await setReportPermission(user.id, uuidField(formData, "userId"), formData.get("enabled") === "1");
  revalidatePath("/circle");
  revalidatePath("/reports");
}

export async function removeMemberAction(formData: FormData) {
  const user = await requireUser();
  await removeMember(user.id, uuidField(formData, "userId"));
  revalidatePath("/circle");
  revalidatePath("/dashboard");
}
