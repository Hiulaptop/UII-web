import type { AlertSummary, AlertType, Flag, SensorStats, Severity, TimeOfDay } from "./rules";
import type { Narrative } from "./narrative";

// Exactly what is sent to the model: aggregates only, no names, emails, coordinates or real alert ids.
export type ReportInput = {
  period: { days: number; start: string; end: string };
  subject: { age_group: string | null; sex: "male" | "female" | "unspecified" };
  alerts: AlertSummary & { avg_response_sec: number | null; acknowledged: number };
  previous: { total: number; by_type: Record<AlertType, number> } | null;
  sensor: (SensorStats & { days_total: number }) | null;
  medication: null;
  flags: Flag[];
  events: {
    ref: string;
    type: AlertType;
    severity: Severity;
    status: string;
    local_date: string;
    time_of_day: TimeOfDay;
    heart_rate: number | null;
  }[];
};

export type Evidence = Record<
  string,
  { alert_id: string; detected_at: string; type: AlertType; severity: Severity; status: string; heart_rate: number | null }
>;

export type ReportRow = {
  id: string;
  subject_id: string;
  requested_by: string;
  period_days: 7 | 30 | 90;
  period_start: string;
  period_end: string;
  status: "pending" | "ready" | "failed";
  user_note: string | null;
  input_snapshot: ReportInput | null;
  output: Narrative | null;
  evidence: Evidence | null;
  model: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};
