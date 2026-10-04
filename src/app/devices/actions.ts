"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createPairingCode, revokeDevice } from "@/lib/device/pairing";
import { formatCode } from "@/lib/device/tokens";

export type PairingState = { code?: string; expiresAt?: string; error?: string } | null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createPairingCodeAction(): Promise<PairingState> {
  const userId = (await auth())?.user?.id;
  if (!userId) return { error: "Bạn cần đăng nhập lại." };
  const { code, expiresAt } = await createPairingCode(userId);
  return { code: formatCode(code), expiresAt };
}

export async function revokeDeviceAction(formData: FormData) {
  const userId = (await auth())?.user?.id;
  const id = formData.get("deviceId");
  if (!userId || typeof id !== "string" || !UUID_RE.test(id)) throw new Error("Invalid request");
  await revokeDevice(userId, id);
  revalidatePath("/devices");
}
