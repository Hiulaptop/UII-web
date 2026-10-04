import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  ageGroup,
  computeFlags,
  pickNotableEvents,
  sexCode,
  summarize,
  timeOfDay,
  vnDate,
  type AlertType,
  type RuleAlert,
  type SensorStats,
  type Severity,
} from "./rules";
import type { Evidence, ReportInput } from "./types";

const DAY_MS = 86_400_000;
const MIN_DAYS = 3;
const MAX_ALERTS = 1000;

type AlertRow = { id: string; type: AlertType; severity: Severity; status: string; detected_at: string; metrics: { heart_rate?: number } | null };

async function fetchAlerts(subjectId: string, fromIso: string, toIso: string): Promise<RuleAlert[]> {
  const { data, error } = await supabaseAdmin()
    .from("alerts")
    .select("id, type, severity, status, detected_at, metrics")
    .eq("subject_id", subjectId)
    .gte("detected_at", fromIso)
    .lt("detected_at", toIso)
    .order("detected_at")
    .limit(MAX_ALERTS);
  if (error) throw new Error(error.message);
  return (data as AlertRow[]).map((a) => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    status: a.status,
    detected_at: a.detected_at,
    hr: typeof a.metrics?.heart_rate === "number" ? a.metrics.heart_rate : null,
  }));
}

async function fetchResponseTimes(subjectId: string, fromIso: string, toIso: string) {
  const { data, error } = await supabaseAdmin()
    .from("alert_events")
    .select("alert_id, at, alerts!inner(subject_id, detected_at)")
    .eq("action", "acknowledged")
    .eq("alerts.subject_id", subjectId)
    .gte("alerts.detected_at", fromIso)
    .lt("alerts.detected_at", toIso)
    .order("at")
    .limit(MAX_ALERTS * 2);
  if (error) throw new Error(error.message);
  const first = new Map<string, number>();
  for (const row of data as unknown as { alert_id: string; at: string; alerts: { detected_at: string } }[]) {
    if (first.has(row.alert_id)) continue;
    const sec = (Date.parse(row.at) - Date.parse(row.alerts.detected_at)) / 1000;
    if (sec >= 0) first.set(row.alert_id, sec);
  }
  const values = [...first.values()];
  return { acknowledged: values.length, avg: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null };
}

async function fetchSensor(subjectId: string, fromIso: string, toIso: string): Promise<SensorStats | null> {
  const { data, error } = await supabaseAdmin().rpc("report_sensor_stats", { p_subject: subjectId, p_from: fromIso, p_to: toIso });
  if (error) throw new Error(error.message);
  const r = (data as SensorStats[] | null)?.[0];
  if (!r) return null;
  return {
    samples: Number(r.samples),
    avg_hr: r.avg_hr == null ? null : Number(r.avg_hr),
    max_hr: r.max_hr == null ? null : Number(r.max_hr),
    min_hr: r.min_hr == null ? null : Number(r.min_hr),
    days_with_data: Number(r.days_with_data),
  };
}

export type ReportData =
  | { ok: true; input: ReportInput; evidence: Evidence; start: Date; end: Date }
  | { ok: false; error: "insufficient_range" };

// historyFrom is the guardian's visibility floor: nothing before it is read, so it cannot leak into a report.
export async function buildReportData(p: {
  subjectId: string;
  periodDays: 7 | 30 | 90;
  historyFrom: string | null;
  nowMs?: number;
}): Promise<ReportData> {
  const nowMs = p.nowMs ?? Date.now();
  const floorMs = p.historyFrom ? Date.parse(p.historyFrom) : -Infinity;
  const startMs = Math.max(nowMs - p.periodDays * DAY_MS, floorMs);
  const days = Math.max(1, Math.ceil((nowMs - startMs) / DAY_MS));
  if (days < MIN_DAYS) return { ok: false, error: "insufficient_range" };

  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(nowMs).toISOString();
  const prevStartMs = startMs - days * DAY_MS;
  const prevAvailable = prevStartMs >= floorMs;

  const [alerts, prevAlerts, response, sensor, profile] = await Promise.all([
    fetchAlerts(p.subjectId, startIso, endIso),
    prevAvailable ? fetchAlerts(p.subjectId, new Date(prevStartMs).toISOString(), startIso) : Promise.resolve(null),
    fetchResponseTimes(p.subjectId, startIso, endIso),
    fetchSensor(p.subjectId, startIso, endIso),
    supabaseAdmin().from("profiles").select("date_of_birth, sex").eq("user_id", p.subjectId).maybeSingle(),
  ]);
  if (profile.error) throw new Error(profile.error.message);

  const cur = summarize(alerts, startMs, days);
  const prev = prevAlerts ? summarize(prevAlerts, prevStartMs, days) : null;
  const flags = computeFlags(cur, prev, sensor, days, alerts);
  const notable = pickNotableEvents(alerts);

  const input: ReportInput = {
    period: { days, start: vnDate(startIso), end: vnDate(endIso) },
    subject: {
      age_group: ageGroup((profile.data as { date_of_birth: string | null } | null)?.date_of_birth ?? null, nowMs),
      sex: sexCode((profile.data as { sex: string | null } | null)?.sex ?? null),
    },
    alerts: { ...cur, avg_response_sec: response.avg, acknowledged: response.acknowledged },
    previous: prev ? { total: prev.total, by_type: prev.by_type } : null,
    sensor: sensor ? { ...sensor, days_total: days } : null,
    medication: null,
    flags,
    events: notable.map(({ ref, alert }) => ({
      ref,
      type: alert.type,
      severity: alert.severity,
      status: alert.status,
      local_date: vnDate(alert.detected_at),
      time_of_day: timeOfDay(alert.detected_at),
      heart_rate: alert.hr,
    })),
  };
  const evidence: Evidence = Object.fromEntries(
    notable.map(({ ref, alert }) => [
      ref,
      { alert_id: alert.id, detected_at: alert.detected_at, type: alert.type, severity: alert.severity, status: alert.status, heart_rate: alert.hr },
    ]),
  );
  return { ok: true, input, evidence, start: new Date(startMs), end: new Date(nowMs) };
}
