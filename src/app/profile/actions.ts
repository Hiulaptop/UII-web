"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { parseSosForm } from "@/lib/sos/schema";
import { createLink, revokeLink, saveProfile } from "@/lib/sos/service";

export type ProfileState = { ok?: boolean; error?: string } | null;
export type LinkState = { error?: string; url?: string; qr?: string } | null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUserId() {
  const id = (await auth())?.user?.id;
  if (!id) throw new Error("Unauthenticated");
  return id;
}

export async function saveProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const uid = await requireUserId();
  const parsed = parseSosForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  await saveProfile(uid, parsed.data);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createLinkAction(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const uid = await requireUserId();
  const r = await createLink(uid, String(formData.get("ttl") ?? ""));
  if (!r.ok) return { error: r.error };
  revalidatePath("/profile/qr");
  return { url: r.url, qr: r.qr };
}

export async function revokeLinkAction(formData: FormData) {
  const uid = await requireUserId();
  const id = formData.get("id");
  if (typeof id !== "string" || !UUID_RE.test(id)) throw new Error("Invalid id");
  await revokeLink(uid, id);
  revalidatePath("/profile/qr");
}
