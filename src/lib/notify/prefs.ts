import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PrefsInput } from "./prefs-schema";

export type MyCirclePrefs = {
  circleId: string;
  subjectName: string;
  prefs: PrefsInput;
};

const DEFAULTS: PrefsInput = { channels: ["push"], min_severity: "low", types: ["pre_seizure", "fall", "seizure"], quiet_start: null, quiet_end: null };
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

/** The circles where the user is a relative (not the wearer), each with their notification settings. */
export async function listMyPrefs(userId: string): Promise<MyCirclePrefs[]> {
  const { data, error } = await supabaseAdmin()
    .from("circle_members")
    .select("circle_id, circles!inner(subject_id, subject:subject_id(name, email)), notification_preferences(min_severity, types, channels, quiet_start, quiet_end)")
    .eq("user_id", userId)
    .eq("status", "active")
    .neq("circles.subject_id", userId);
  if (error) throw new Error(error.message);
  type Row = {
    circle_id: string;
    circles: { subject: { name: string | null; email: string } | null };
    notification_preferences: PrefsInput | PrefsInput[] | null;
  };
  return (data as unknown as Row[]).map((r) => {
    const p = Array.isArray(r.notification_preferences) ? r.notification_preferences[0] : r.notification_preferences;
    const s = r.circles.subject;
    return {
      circleId: r.circle_id,
      subjectName: s?.name || s?.email.split("@")[0] || "Người thân",
      prefs: p
        ? { ...p, channels: p.channels.filter((c) => c === "push" || c === "email"), quiet_start: hhmm(p.quiet_start), quiet_end: hhmm(p.quiet_end) }
        : DEFAULTS,
    };
  });
}

export async function savePrefs(userId: string, circleId: string, p: PrefsInput): Promise<boolean> {
  const db = supabaseAdmin();
  const m = await db.from("circle_members").select("user_id").eq("circle_id", circleId).eq("user_id", userId).eq("status", "active").maybeSingle();
  if (m.error) throw new Error(m.error.message);
  if (!m.data) return false;
  const up = await db.from("notification_preferences").upsert({ circle_id: circleId, user_id: userId, ...p }, { onConflict: "circle_id,user_id" });
  if (up.error) throw new Error(up.error.message);
  return true;
}
