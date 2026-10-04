import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLimiter } from "./rate-limit";
import { hashCode, hashToken, newDeviceToken, newPairingCode, normalizeCode } from "./tokens";

export const PAIRING_TTL_MS = 10 * 60_000;
export const MAX_ACTIVE_DEVICES = 5;
const ONLINE_MS = 5 * 60_000;

const perIp = createLimiter(10, 60_000);
const overall = createLimiter(300, PAIRING_TTL_MS);

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

export async function createPairingCode(userId: string) {
  const db = supabaseAdmin();
  // Only one live code per user, so a stale code cannot be used after a new one is shown.
  await db.from("device_pairing_codes").delete().eq("user_id", userId).is("used_at", null);
  const code = newPairingCode();
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MS);
  const { error } = await db
    .from("device_pairing_codes")
    .insert({ user_id: userId, code_hash: hashCode(code, secret()), expires_at: expiresAt.toISOString() });
  if (error) throw new Error(error.message);
  return { code, expiresAt: expiresAt.toISOString() };
}

export type PairResult =
  | { ok: true; deviceId: string; token: string }
  | { ok: false; error: "rate_limited" | "invalid_code" | "too_many_devices" };

export async function pairDevice(
  input: { code: string; name?: string; model?: string; platform?: string },
  ip: string,
): Promise<PairResult> {
  // Counted before the lookup so wrong guesses are limited as well as right ones.
  if (!perIp.allow(ip) || !overall.allow("all")) return { ok: false, error: "rate_limited" };

  const code = normalizeCode(input.code);
  if (!code) return { ok: false, error: "invalid_code" };

  const db = supabaseAdmin();
  // Single statement: the code is consumed atomically, so two watches cannot both use it.
  const used = await db
    .from("device_pairing_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code_hash", hashCode(code, secret()))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id");
  if (used.error) throw new Error(used.error.message);
  const userId = used.data?.[0]?.user_id as string | undefined;
  if (!userId) return { ok: false, error: "invalid_code" };

  const active = await db.from("devices").select("id", { count: "exact", head: true }).eq("user_id", userId).is("revoked_at", null);
  if (active.error) throw new Error(active.error.message);
  if ((active.count ?? 0) >= MAX_ACTIVE_DEVICES) return { ok: false, error: "too_many_devices" };

  const token = newDeviceToken();
  const ins = await db
    .from("devices")
    .insert({
      user_id: userId,
      name: input.name ?? "Đồng hồ",
      model: input.model ?? null,
      platform: input.platform ?? "wearos",
      token_hash: hashToken(token),
      last_seen_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (ins.error) throw new Error(ins.error.message);
  return { ok: true, deviceId: ins.data.id as string, token };
}

export async function listDevices(userId: string) {
  const { data, error } = await supabaseAdmin()
    .from("devices")
    .select("id, name, model, platform, battery_pct, last_seen_at, paired_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("paired_at");
  if (error) throw new Error(error.message);
  const rows = data as { id: string; name: string | null; model: string | null; platform: string; battery_pct: number | null; last_seen_at: string | null; paired_at: string }[];
  const now = Date.now();
  return rows.map((d) => ({ ...d, online: d.last_seen_at != null && now - Date.parse(d.last_seen_at) < ONLINE_MS }));
}

export async function revokeDevice(userId: string, deviceId: string) {
  const { error } = await supabaseAdmin()
    .from("devices")
    .update({ revoked_at: new Date().toISOString(), token_hash: null, push_token: null })
    .eq("id", deviceId)
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error) throw new Error(error.message);
}
