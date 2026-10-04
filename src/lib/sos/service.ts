import "server-only";
import { isIP } from "node:net";
import QRCode from "qrcode";
import { createLimiter } from "@/lib/device/rate-limit";
import { appUrl } from "@/lib/invites";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SosProfileInput } from "./schema";
import { ageFromBirth, expiryFor, hashSosToken, isSosToken, newSosToken } from "./tokens";

export const MAX_ACTIVE_LINKS = 10;
const perIp = createLimiter(30, 60_000);

export type EditableProfile = {
  profile: {
    full_name: string | null; date_of_birth: string | null; sex: string | null; blood_type: string | null;
    height_cm: number | null; weight_kg: number | null; epilepsy_type: string | null; seizure_notes: string | null;
    allergies: string[]; conditions: string[]; doctor_name: string | null; doctor_phone: string | null;
    hospital: string | null;
  } | null;
  meds: { name: string; dosage: string | null; schedule: string | null }[];
  contacts: { name: string; relation: string | null; phone: string }[];
};

const PROFILE_COLS =
  "full_name, date_of_birth, sex, blood_type, height_cm, weight_kg, epilepsy_type, seizure_notes, allergies, conditions, doctor_name, doctor_phone, hospital";

export async function loadProfile(userId: string): Promise<EditableProfile> {
  const db = supabaseAdmin();
  const [p, m, c] = await Promise.all([
    db.from("profiles").select(PROFILE_COLS).eq("user_id", userId).maybeSingle(),
    db.from("medications").select("name, dosage, schedule").eq("user_id", userId).order("created_at"),
    db.from("emergency_contacts").select("name, relation, phone").eq("user_id", userId).order("priority"),
  ]);
  for (const r of [p, m, c]) if (r.error) throw new Error(r.error.message);
  return { profile: p.data as EditableProfile["profile"], meds: m.data as EditableProfile["meds"], contacts: c.data as EditableProfile["contacts"] };
}

export async function saveProfile(userId: string, d: SosProfileInput) {
  const { error } = await supabaseAdmin().rpc("save_sos_profile", {
    p_user: userId,
    p_profile: d.profile,
    p_meds: d.meds,
    p_contacts: d.contacts,
  });
  if (error) throw new Error(error.message);
}

// ---------- share links ----------

export type SosLink = { id: string; created_at: string; expires_at: string | null; revoked_at: string | null; views: number; last_view: string | null };

export async function listLinks(userId: string): Promise<SosLink[]> {
  const db = supabaseAdmin();
  const tokens = await db.from("sos_access_tokens").select("id, created_at, expires_at, revoked_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  if (tokens.error) throw new Error(tokens.error.message);
  const ids = tokens.data.map((t) => t.id as string);
  const logs = ids.length
    ? await db.from("sos_access_logs").select("token_id, accessed_at").in("token_id", ids).order("accessed_at", { ascending: false }).limit(1000)
    : { data: [], error: null };
  if (logs.error) throw new Error(logs.error.message);
  const stats = new Map<string, { views: number; last: string }>();
  for (const l of logs.data as { token_id: string; accessed_at: string }[]) {
    const s = stats.get(l.token_id);
    if (s) s.views++;
    else stats.set(l.token_id, { views: 1, last: l.accessed_at });
  }
  return (tokens.data as Omit<SosLink, "views" | "last_view">[]).map((t) => ({ ...t, views: stats.get(t.id)?.views ?? 0, last_view: stats.get(t.id)?.last ?? null }));
}

export const isActive = (l: Pick<SosLink, "expires_at" | "revoked_at">, now = Date.now()) =>
  !l.revoked_at && (!l.expires_at || Date.parse(l.expires_at) > now);

export type CreateLinkResult = { ok: true; url: string; qr: string } | { ok: false; error: string };

export async function createLink(userId: string, ttl: string): Promise<CreateLinkResult> {
  const exp = expiryFor(ttl);
  if (!exp.ok) return { ok: false, error: "Thời hạn không hợp lệ." };
  const profile = await supabaseAdmin().from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (profile.error) throw new Error(profile.error.message);
  if (!profile.data) return { ok: false, error: "Hãy tạo hồ sơ SOS trước khi tạo mã QR." };

  const active = (await listLinks(userId)).filter((l) => isActive(l)).length;
  if (active >= MAX_ACTIVE_LINKS) return { ok: false, error: `Đã có ${MAX_ACTIVE_LINKS} mã đang dùng. Hãy thu hồi bớt trước.` };

  const token = newSosToken();
  const ins = await supabaseAdmin().from("sos_access_tokens").insert({ user_id: userId, token_hash: hashSosToken(token), expires_at: exp.expiresAt });
  if (ins.error) throw new Error(ins.error.message);
  const url = `${appUrl()}/sos/${token}`;
  // Only the hash is stored, so this is the one time the link can be shown.
  return { ok: true, url, qr: await QRCode.toDataURL(url, { margin: 2, width: 320, errorCorrectionLevel: "M" }) };
}

export async function revokeLink(userId: string, id: string) {
  const { error } = await supabaseAdmin()
    .from("sos_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error) throw new Error(error.message);
}

// ---------- the public card ----------

export type SosCard = {
  name: string | null; age: number | null; sex: string | null; blood_type: string | null;
  height_cm: number | null; weight_kg: number | null; epilepsy_type: string | null; seizure_notes: string | null;
  allergies: string[]; conditions: string[]; doctor_name: string | null; doctor_phone: string | null; hospital: string | null;
  meds: EditableProfile["meds"]; contacts: EditableProfile["contacts"];
};

export type CardResult = { kind: "ok"; card: SosCard } | { kind: "not_found" } | { kind: "rate_limited" };

/** Looks up a card by its secret link, records the view and returns only what an emergency responder needs. */
export async function getCardByToken(token: string, ip: string, userAgent: string | null): Promise<CardResult> {
  if (!perIp.allow(ip)) return { kind: "rate_limited" };
  if (!isSosToken(token)) return { kind: "not_found" };
  const db = supabaseAdmin();
  const t = await db.from("sos_access_tokens").select("id, user_id, expires_at, revoked_at").eq("token_hash", hashSosToken(token)).maybeSingle();
  if (t.error) throw new Error(t.error.message);
  if (!t.data || !isActive({ expires_at: t.data.expires_at as string | null, revoked_at: t.data.revoked_at as string | null })) return { kind: "not_found" };

  const userId = t.data.user_id as string;
  const [data, log] = await Promise.all([
    loadProfile(userId),
    db.from("sos_access_logs").insert({ token_id: t.data.id, ip: isIP(ip) ? ip : null, user_agent: userAgent?.slice(0, 300) ?? null }),
  ]);
  if (log.error) console.error("[sos] view not logged:", log.error.code);
  const p = data.profile;
  if (!p) return { kind: "not_found" };
  return {
    kind: "ok",
    card: {
      name: p.full_name, age: ageFromBirth(p.date_of_birth), sex: p.sex, blood_type: p.blood_type,
      height_cm: p.height_cm, weight_kg: p.weight_kg, epilepsy_type: p.epilepsy_type, seizure_notes: p.seizure_notes,
      allergies: p.allergies, conditions: p.conditions, doctor_name: p.doctor_name, doctor_phone: p.doctor_phone,
      hospital: p.hospital, meds: data.meds, contacts: data.contacts,
    },
  };
}
