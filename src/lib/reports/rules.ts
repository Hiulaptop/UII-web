// Pure report logic: no I/O and no path aliases, so it can be unit-tested with plain Node.
// Every number in a report is computed here; the language model only writes prose around them.

export type AlertType = "pre_seizure" | "fall" | "seizure";
export type Severity = "low" | "medium" | "high" | "critical";
export type TimeOfDay = "night" | "morning" | "afternoon" | "evening";

export type RuleAlert = {
  id: string;
  type: AlertType;
  severity: Severity;
  status: string;
  detected_at: string;
  hr: number | null;
};

export type AlertSummary = {
  total: number;
  by_type: Record<AlertType, number>;
  by_severity: Record<Severity, number>;
  by_time_of_day: Record<TimeOfDay, number>;
  false_alarms: number;
  avg_alert_hr: number | null;
  by_week: number[];
};

export type SensorStats = {
  samples: number;
  avg_hr: number | null;
  max_hr: number | null;
  min_hr: number | null;
  days_with_data: number;
};

export type FlagCode =
  | "seizure_cluster"
  | "seizure_present"
  | "alerts_increase"
  | "night_concentration"
  | "high_false_alarm"
  | "low_data_coverage"
  | "no_sensor_data";

export type Flag = { code: FlagCode; level: "info" | "attention" | "urgent"; data: Record<string, number> };

const DAY_MS = 86_400_000;
const VN_OFFSET_MS = 7 * 3_600_000;
const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

const vnShifted = (iso: string) => new Date(Date.parse(iso) + VN_OFFSET_MS);

export function timeOfDay(iso: string): TimeOfDay {
  const h = vnShifted(iso).getUTCHours();
  if (h >= 22 || h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export function vnDate(iso: string): string {
  return vnShifted(iso).toISOString().slice(0, 10);
}

const zeroBy = <K extends string>(keys: K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

export function summarize(alerts: RuleAlert[], startMs: number, days: number): AlertSummary {
  const weeks = Math.max(1, Math.ceil(days / 7));
  const out: AlertSummary = {
    total: alerts.length,
    by_type: zeroBy<AlertType>(["pre_seizure", "fall", "seizure"]),
    by_severity: zeroBy<Severity>(["low", "medium", "high", "critical"]),
    by_time_of_day: zeroBy<TimeOfDay>(["night", "morning", "afternoon", "evening"]),
    false_alarms: 0,
    avg_alert_hr: null,
    by_week: Array(weeks).fill(0),
  };
  let hrSum = 0;
  let hrCount = 0;
  for (const a of alerts) {
    out.by_type[a.type]++;
    out.by_severity[a.severity]++;
    out.by_time_of_day[timeOfDay(a.detected_at)]++;
    if (a.status === "false_alarm") out.false_alarms++;
    if (a.hr != null) {
      hrSum += a.hr;
      hrCount++;
    }
    const idx = Math.min(weeks - 1, Math.max(0, Math.floor((Date.parse(a.detected_at) - startMs) / (7 * DAY_MS))));
    out.by_week[idx]++;
  }
  out.avg_alert_hr = hrCount ? Math.round((hrSum / hrCount) * 10) / 10 : null;
  return out;
}

export function computeFlags(
  cur: AlertSummary,
  prev: AlertSummary | null,
  sensor: SensorStats | null,
  daysTotal: number,
  alerts: RuleAlert[],
): Flag[] {
  const flags: Flag[] = [];

  const seizures = alerts
    .filter((a) => a.type === "seizure")
    .map((a) => Date.parse(a.detected_at))
    .sort((a, b) => a - b);
  let cluster = false;
  for (let i = 1; i < seizures.length; i++) if (seizures[i] - seizures[i - 1] <= DAY_MS) cluster = true;
  if (cluster) flags.push({ code: "seizure_cluster", level: "urgent", data: { seizures: seizures.length } });
  else if (seizures.length) flags.push({ code: "seizure_present", level: "attention", data: { seizures: seizures.length } });

  if (prev && cur.total - prev.total >= 2 && cur.total >= prev.total * 1.5) {
    flags.push({ code: "alerts_increase", level: "attention", data: { current: cur.total, previous: prev.total } });
  }
  if (cur.total >= 3 && cur.by_time_of_day.night / cur.total >= 0.6) {
    flags.push({ code: "night_concentration", level: "attention", data: { night: cur.by_time_of_day.night, total: cur.total } });
  }
  if (cur.total >= 3 && cur.false_alarms / cur.total >= 0.4) {
    flags.push({ code: "high_false_alarm", level: "info", data: { false_alarms: cur.false_alarms, total: cur.total } });
  }
  if (!sensor || sensor.samples === 0) {
    flags.push({ code: "no_sensor_data", level: "info", data: {} });
  } else if (sensor.days_with_data / daysTotal < 0.7) {
    flags.push({ code: "low_data_coverage", level: "info", data: { days_with_data: sensor.days_with_data, days_total: daysTotal } });
  }
  return flags;
}

export type NotableEvent = { ref: string; alert: RuleAlert };

// Anonymous references (E1, E2, ...) let the model point at events without seeing real ids.
export function pickNotableEvents(alerts: RuleAlert[], max = 10): NotableEvent[] {
  const typeWeight: Record<AlertType, number> = { seizure: 3, fall: 2, pre_seizure: 1 };
  const ranked = [...alerts]
    .sort(
      (a, b) =>
        typeWeight[b.type] - typeWeight[a.type] ||
        SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
        Date.parse(b.detected_at) - Date.parse(a.detected_at),
    )
    .slice(0, max)
    .sort((a, b) => Date.parse(a.detected_at) - Date.parse(b.detected_at));
  return ranked.map((alert, i) => ({ ref: `E${i + 1}`, alert }));
}

export function ageGroup(dob: string | null, nowMs: number): string | null {
  if (!dob) return null;
  const t = Date.parse(dob);
  if (Number.isNaN(t)) return null;
  const years = Math.floor((nowMs - t) / (365.25 * DAY_MS));
  if (years < 0 || years > 120) return null;
  if (years < 13) return "dưới 13";
  if (years < 18) return "13-17";
  if (years >= 60) return "60+";
  const lo = Math.floor(years / 10) * 10;
  return years < 30 ? "18-29" : `${lo}-${lo + 9}`;
}

export function sexCode(raw: string | null): "male" | "female" | "unspecified" {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "nam" || s === "male") return "male";
  if (s === "nữ" || s === "nu" || s === "female") return "female";
  return "unspecified";
}

