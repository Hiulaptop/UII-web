import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { publishToCircle } from "@/lib/notify/audience";
import type { AlertSeverity, AlertStatus, AlertType, CircleRole } from "@/lib/labels";

export const PAGE_SIZE = 20;

export type Access = { self: boolean; role: CircleRole; historyFrom: string | null };

// The wearer sees everything; a relative sees an alert only if they are an active member and it is within their history.
export async function getSubjectAccess(userId: string, subjectId: string): Promise<Access | null> {
  if (userId === subjectId) return { self: true, role: "owner", historyFrom: null };
  const { data, error } = await supabaseAdmin()
    .from("circle_members")
    .select("role, history_from, circles!inner(subject_id)")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("circles.subject_id", subjectId)
    .limit(1);
  if (error) throw new Error(error.message);
  const m = (data as unknown as { role: CircleRole; history_from: string | null }[] | null)?.[0];
  return m ? { self: false, role: m.role, historyFrom: m.history_from } : null;
}

const canAct = (a: Access) => a.self || a.role === "guardian";

export type AlertListRow = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  detected_at: string;
  trigger: string;
  metrics: { heart_rate?: number } | null;
};

export async function listAlerts(p: { subjectId: string; historyFrom: string | null; type?: string; status?: string; page: number }) {
  let q = supabaseAdmin()
    .from("alerts")
    .select("id, type, severity, status, detected_at, trigger, metrics", { count: "exact" })
    .eq("subject_id", p.subjectId)
    .gte("detected_at", p.historyFrom ?? "1970-01-01T00:00:00Z")
    .order("detected_at", { ascending: false })
    .range((p.page - 1) * PAGE_SIZE, p.page * PAGE_SIZE - 1);
  if (p.type) q = q.eq("type", p.type);
  if (p.status) q = q.eq("status", p.status);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { rows: data as AlertListRow[], total: count ?? 0 };
}

export type AlertDetail = {
  alert: AlertListRow & { subject_id: string; confidence: number | null; lat: number | null; lng: number | null; note: string | null; resolved_at: string | null; device: { name: string | null } | null };
  access: Access;
  canAct: boolean;
  hasSnapshot: boolean;
  events: { id: number; action: string; at: string; user: { name: string | null; email: string } | null }[];
  notified: { id: string; channel: string; status: string; recipient: { name: string | null; email: string } | null }[];
};

export async function getAlertDetail(alertId: string, userId: string): Promise<AlertDetail | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("alerts")
    .select("id, subject_id, type, severity, status, detected_at, trigger, metrics, confidence, lat, lng, note, resolved_at, device:devices(name)")
    .eq("id", alertId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const alert = data as unknown as AlertDetail["alert"];

  const access = await getSubjectAccess(userId, alert.subject_id);
  if (!access) return null;
  if (access.historyFrom && Date.parse(alert.detected_at) < Date.parse(access.historyFrom)) return null;

  const privileged = access.self || access.role === "guardian";
  const [events, notified, snap] = await Promise.all([
    db.from("alert_events").select("id, action, at, user_id, user:users(name, email)").eq("alert_id", alertId).order("at"),
    privileged
      ? db.from("notifications").select("id, channel, status, recipient:users!recipient_id(name, email)").eq("alert_id", alertId)
      : Promise.resolve({ data: [], error: null }),
    db.from("alert_snapshots").select("alert_id", { count: "exact", head: true }).eq("alert_id", alertId),
  ]);
  if (events.error) throw new Error(events.error.message);
  if (notified.error) throw new Error(notified.error.message);

  // Record that this person looked, once. It feeds the timeline relatives and the wearer rely on.
  const eventRows = events.data as unknown as (AlertDetail["events"][number] & { user_id: string | null })[];
  if (!eventRows.some((e) => e.user_id === userId && e.action === "viewed")) {
    await db.from("alert_events").insert({ alert_id: alertId, user_id: userId, action: "viewed" });
  }

  return {
    alert,
    access,
    canAct: canAct(access),
    hasSnapshot: (snap.count ?? 0) > 0,
    events: eventRows,
    notified: notified.data as unknown as AlertDetail["notified"],
  };
}

export type AlertAction = "acknowledge" | "false_alarm" | "resolve";
const TRANSITIONS: Record<AlertAction, { from: AlertStatus[]; to: AlertStatus; event: string; closes: boolean }> = {
  acknowledge: { from: ["open"], to: "acknowledged", event: "acknowledged", closes: false },
  false_alarm: { from: ["open", "acknowledged"], to: "false_alarm", event: "marked_false_alarm", closes: true },
  resolve: { from: ["open", "acknowledged"], to: "resolved", event: "resolved", closes: true },
};

export async function applyAlertAction(alertId: string, userId: string, action: AlertAction): Promise<{ ok: true } | { ok: false; error: "not_found" | "forbidden" | "conflict" }> {
  const t = TRANSITIONS[action];
  if (!t) return { ok: false, error: "not_found" };
  const db = supabaseAdmin();

  const found = await db.from("alerts").select("subject_id").eq("id", alertId).maybeSingle();
  if (found.error) throw new Error(found.error.message);
  if (!found.data) return { ok: false, error: "not_found" };

  const access = await getSubjectAccess(userId, found.data.subject_id as string);
  if (!access) return { ok: false, error: "not_found" };
  if (!canAct(access)) return { ok: false, error: "forbidden" };

  // The status in the WHERE clause makes a double click or two relatives acting at once safe: only one wins.
  const upd = await db
    .from("alerts")
    .update({ status: t.to, ...(t.closes ? { resolved_at: new Date().toISOString(), resolved_by: userId } : {}) })
    .eq("id", alertId)
    .in("status", t.from)
    .select("id");
  if (upd.error) throw new Error(upd.error.message);
  if (!upd.data?.length) return { ok: false, error: "conflict" };

  await db.from("alert_events").insert({ alert_id: alertId, user_id: userId, action: t.event });
  publishToCircle(found.data.subject_id as string, { kind: "alert_updated", alertId, status: t.to }).catch(() => {});
  return { ok: true };
}
