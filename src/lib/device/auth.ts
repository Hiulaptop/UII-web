import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hashToken, parseBearer } from "./tokens";

export type DeviceAuth = { deviceId: string; userId: string };

const TOUCH_EVERY_MS = 30_000;
const lastTouched = new Map<string, number>();

// The wearer is the device's owner: every record a device creates belongs to that user.
export async function authenticateDevice(req: Request): Promise<DeviceAuth | null> {
  const token = parseBearer(req.headers.get("authorization"));
  if (!token) return null;

  const { data, error } = await supabaseAdmin()
    .from("devices")
    .select("id, user_id, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.revoked_at) return null;

  const now = Date.now();
  if (now - (lastTouched.get(data.id) ?? 0) > TOUCH_EVERY_MS) {
    lastTouched.set(data.id, now);
    await supabaseAdmin().from("devices").update({ last_seen_at: new Date(now).toISOString() }).eq("id", data.id);
  }
  return { deviceId: data.id as string, userId: data.user_id as string };
}
