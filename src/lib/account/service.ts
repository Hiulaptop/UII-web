import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripSecrets } from "./confirm";

const MAX_ALERTS = 5000;

function ok<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Everything the account holder owns, as one JSON document. Secrets (token hashes, Google ids) are left out. */
export async function exportUserData(userId: string) {
  const db = supabaseAdmin();
  const [user, profile, meds, contacts, circles, memberships, devices, alerts, tokens, schedules, logs] = await Promise.all([
    db.from("users").select("id, email, name, created_at").eq("id", userId).maybeSingle(),
    db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    db.from("medications").select("name, dosage, schedule, created_at").eq("user_id", userId),
    db.from("emergency_contacts").select("name, relation, phone, priority").eq("user_id", userId).order("priority"),
    db.from("circles").select("id, name, created_at, circle_members(role, status, joined_at, history_from, users(name, email))").eq("subject_id", userId),
    db.from("circle_members").select("role, status, joined_at, circles!inner(name, subject_id)").eq("user_id", userId).neq("circles.subject_id", userId),
    db.from("devices").select("id, name, model, platform, paired_at, last_seen_at, revoked_at").eq("user_id", userId),
    db.from("alerts").select("id, type, severity, status, trigger, detected_at, resolved_at, note, metrics, lat, lng, accuracy_m, located_at, alert_locations(t, lat, lng, accuracy_m), alert_events(action, at, note)").eq("subject_id", userId).order("detected_at", { ascending: false }).limit(MAX_ALERTS),
    db.from("sos_access_tokens").select("id, created_at, expires_at, revoked_at, sos_access_logs(accessed_at, user_agent)").eq("user_id", userId),
    db.from("medication_schedules").select("name, dosage, times, days, start_date, end_date, remind, lead_minutes, created_at").eq("user_id", userId),
    db.from("medication_logs").select("scheduled_for, taken_at").eq("user_id", userId).order("scheduled_for", { ascending: false }).limit(5000),
  ]);
  // The medication tables arrive with a later migration; an export must still work before it is applied.
  const optional = <T>(r: { data: T | null; error: { message: string; code?: string } | null }) => (r.error ? ([] as unknown as T) : (r.data as T));

  return stripSecrets({
    exported_at: new Date().toISOString(),
    note: "Dữ liệu cảm biến thô (nhịp tim, gia tốc) không nằm trong tệp này. Liên hệ quản trị nếu bạn cần.",
    account: ok(user),
    sos_profile: ok(profile),
    medications: ok(meds),
    emergency_contacts: ok(contacts),
    my_circles: ok(circles),
    circles_i_belong_to: ok(memberships),
    devices: ok(devices),
    alerts: ok(alerts),
    sos_links: ok(tokens),
    medication_schedules: optional(schedules),
    medication_logs: optional(logs),
  });
}

/** Every QR / link that was shared stops working at once. @return how many were active. */
export async function revokeAllSosLinks(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from("sos_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

/** Removes the user and, through the database's cascades, their profile, alerts, circle, devices and links. */
export async function deleteAccount(userId: string) {
  const { error } = await supabaseAdmin().from("users").delete().eq("id", userId);
  if (error) throw new Error(error.message);
}
