import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { recipientsFor, type AlertKind, type Member, type Prefs, type Severity } from "./recipients";

type PrefRow = Omit<Prefs, never>;
type MemberRow = { user_id: string; notification_preferences: PrefRow | PrefRow[] | null };

// Writes one pending notification per recipient and channel. Delivery (email, push, SMS) is done by the senders
// that read these rows; recording intent first means an alert is never lost if a channel is down.
export async function fanOutAlert(alert: { id: string; subjectId: string; type: AlertKind; severity: Severity }) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("circle_members")
    .select("user_id, notification_preferences(min_severity, types, channels, quiet_start, quiet_end), circles!inner(subject_id)")
    .eq("status", "active")
    .eq("circles.subject_id", alert.subjectId)
    .neq("user_id", alert.subjectId);
  if (error) throw new Error(error.message);

  const members: Member[] = (data as unknown as MemberRow[]).map((m) => {
    const p = Array.isArray(m.notification_preferences) ? m.notification_preferences[0] : m.notification_preferences;
    return { user_id: m.user_id, prefs: p ?? null };
  });

  const rows = recipientsFor(alert, members, Date.now()).map((r) => ({
    alert_id: alert.id,
    recipient_id: r.user_id,
    channel: r.channel,
    status: "pending",
  }));
  if (!rows.length) return 0;
  const ins = await db.from("notifications").insert(rows);
  if (ins.error) throw new Error(ins.error.message);
  return rows.length;
}
