import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AlertSeverity, AlertStatus, AlertType, CircleRole, MemberStatus } from "@/lib/labels";

export const HEART_RATE_THRESHOLD = 100;
const CHART_POINTS = 48;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DashboardAlert = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  detected_at: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  metrics: { heart_rate?: number } | null;
};

type Device = { id: string; name: string | null; model: string | null; battery_pct: number | null; last_seen_at: string | null };
type Profile = {
  full_name: string | null;
  blood_type: string | null;
  epilepsy_type: string | null;
  allergies: string[];
  seizure_notes: string | null;
};
type Member = { user_id: string; role: CircleRole; status: MemberStatus; users: { name: string | null; email: string } | null };

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// Wearer: show own data. Guardian without a device: show the first person they monitor.
// historyFrom is the oldest timestamp a guardian may see (null = no limit). Wearers are never limited.
export async function resolveSubject(userId: string): Promise<{ subjectId: string; historyFrom: string | null }> {
  const db = supabaseAdmin();
  const [devices, memberships] = await Promise.all([
    db.from("devices").select("id").eq("user_id", userId).limit(1),
    db
      .from("circle_members")
      .select("history_from, circles!inner(subject_id)")
      .eq("user_id", userId)
      .eq("status", "active")
      .neq("circles.subject_id", userId)
      .order("joined_at")
      .limit(1),
  ]);
  if (unwrap(devices)?.length) return { subjectId: userId, historyFrom: null };
  const m = unwrap(memberships)?.[0] as unknown as
    | { history_from: string | null; circles: { subject_id: string } }
    | undefined;
  return m ? { subjectId: m.circles.subject_id, historyFrom: m.history_from } : { subjectId: userId, historyFrom: null };
}

function downsample(values: number[], points: number) {
  if (values.length <= points) return values;
  const size = values.length / points;
  return Array.from({ length: points }, (_, i) => {
    const slice = values.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
  });
}

export async function getDashboard(userId: string) {
  const db = supabaseAdmin();
  const { subjectId, historyFrom } = await resolveSubject(userId);
  const now = Date.now();
  const floor = historyFrom ?? "1970-01-01T00:00:00Z";
  const since7d = new Date(Math.max(now - 7 * DAY_MS, Date.parse(floor))).toISOString();
  const since24h = new Date(Math.max(now - DAY_MS, Date.parse(floor))).toISOString();

  const [subjectRes, profileRes, medsRes, contactRes, devicesRes, alertsRes, count7dRes, openRes, circleRes] =
    await Promise.all([
      db.from("users").select("id, name, email").eq("id", subjectId).single(),
      db.from("profiles").select("full_name, blood_type, epilepsy_type, allergies, seizure_notes").eq("user_id", subjectId).maybeSingle(),
      db.from("medications").select("name, dosage, schedule").eq("user_id", subjectId).order("created_at"),
      db.from("emergency_contacts").select("name, relation, phone").eq("user_id", subjectId).order("priority").limit(1).maybeSingle(),
      db.from("devices").select("id, name, model, battery_pct, last_seen_at").eq("user_id", subjectId).order("last_seen_at", { ascending: false, nullsFirst: false }),
      db.from("alerts").select("id, type, severity, status, detected_at, lat, lng, note, metrics").eq("subject_id", subjectId).gte("detected_at", floor).order("detected_at", { ascending: false }).limit(10),
      db.from("alerts").select("id", { count: "exact", head: true }).eq("subject_id", subjectId).gte("detected_at", since7d),
      db.from("alerts").select("id", { count: "exact", head: true }).eq("subject_id", subjectId).eq("status", "open").gte("detected_at", floor),
      db.from("circles").select("id, name, circle_members(user_id, role, status, users(name, email))").eq("subject_id", subjectId).limit(1).maybeSingle(),
    ]);

  const devices = unwrap(devicesRes) as Device[] | null ?? [];
  const alerts = (unwrap(alertsRes) as DashboardAlert[] | null) ?? [];
  const circle = unwrap(circleRes) as { id: string; name: string; circle_members: Member[] } | null;
  const members = (circle?.circle_members ?? []).filter((m) => m.status !== "removed");

  const [samplesRes, eventsRes] = await Promise.all([
    devices.length
      ? db.from("sensor_samples").select("heart_rate").in("device_id", devices.map((d) => d.id)).gte("recorded_at", since24h).not("heart_rate", "is", null).order("recorded_at").limit(5000)
      : Promise.resolve({ data: [], error: null }),
    alerts.length
      ? db.from("alert_events").select("alert_id, at").in("alert_id", alerts.map((a) => a.id)).eq("action", "acknowledged").order("at")
      : Promise.resolve({ data: [], error: null }),
  ]);

  const heartRate = downsample(
    ((unwrap(samplesRes) as { heart_rate: number }[] | null) ?? []).map((s) => Math.round(s.heart_rate)),
    CHART_POINTS,
  );

  const firstAck = new Map<string, number>();
  for (const e of (unwrap(eventsRes) as { alert_id: string; at: string }[] | null) ?? []) {
    if (!firstAck.has(e.alert_id)) firstAck.set(e.alert_id, Date.parse(e.at));
  }
  const responseTimes = alerts
    .filter((a) => firstAck.has(a.id))
    .map((a) => (firstAck.get(a.id)! - Date.parse(a.detected_at)) / 1000);
  const avgResponseSec = responseTimes.length
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null;

  return {
    isSelf: subjectId === userId,
    subject: unwrap(subjectRes) as { id: string; name: string | null; email: string },
    profile: unwrap(profileRes) as Profile | null,
    medications: (unwrap(medsRes) as { name: string; dosage: string | null; schedule: string | null }[] | null) ?? [],
    contact: unwrap(contactRes) as { name: string; relation: string | null; phone: string } | null,
    device: devices[0] ?? null,
    alerts,
    openAlert: alerts.find((a) => a.status === "open") ?? null,
    heartRate,
    // Other relatives' identities are visible to the wearer only.
    members: userId === subjectId ? members.filter((m) => m.user_id !== subjectId) : [],
    stats: {
      alerts7d: count7dRes.count ?? 0,
      openAlerts: openRes.count ?? 0,
      avgResponseSec,
      circleMembers: members.filter((m) => m.user_id !== subjectId).length,
    },
  };
}
