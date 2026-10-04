"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { acceptInvite, declineInvite } from "@/lib/invites";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUser() {
  const session = await auth();
  const id = session?.user?.id;
  const email = session?.user?.email;
  if (!id || !email) throw new Error("Unauthenticated");
  return { id, email };
}

function inviteId(formData: FormData) {
  const v = formData.get("inviteId");
  if (typeof v !== "string" || !UUID_RE.test(v)) throw new Error("Invalid inviteId");
  return v;
}

// The database function re-checks that the signed-in user's email matches the invite.
export async function acceptInviteAction(formData: FormData) {
  const user = await requireUser();
  const result = await acceptInvite(inviteId(formData), user.id);
  revalidatePath("/dashboard");
  if (!result.ok) redirect(`/dashboard?invite_error=${encodeURIComponent(result.error)}`);
  redirect("/dashboard");
}

export async function declineInviteAction(formData: FormData) {
  const user = await requireUser();
  await declineInvite(inviteId(formData), user.email);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
