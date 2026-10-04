// Decides who is told about an alert, and over which channel. Pure so it can be tested exhaustively.
export type Severity = "low" | "medium" | "high" | "critical";
export type AlertKind = "pre_seizure" | "fall" | "seizure";
export type Channel = "push" | "email" | "sms";

export type Prefs = {
  min_severity: Severity;
  types: AlertKind[];
  channels: Channel[];
  quiet_start: string | null; // "HH:MM[:SS]" in Vietnam time
  quiet_end: string | null;
};

export type Member = { user_id: string; prefs: Prefs | null };

const RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const VN_OFFSET_MS = 7 * 3_600_000;

export const DEFAULT_PREFS: Prefs = {
  min_severity: "low",
  types: ["pre_seizure", "fall", "seizure"],
  channels: ["push"],
  quiet_start: null,
  quiet_end: null,
};

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export function inQuietHours(prefs: Prefs, nowMs: number): boolean {
  if (!prefs.quiet_start || !prefs.quiet_end) return false;
  const d = new Date(nowMs + VN_OFFSET_MS);
  const cur = d.getUTCHours() * 60 + d.getUTCMinutes();
  const start = toMinutes(prefs.quiet_start);
  const end = toMinutes(prefs.quiet_end);
  if (start === end) return false;
  return start < end ? cur >= start && cur < end : cur >= start || cur < end; // overnight window, e.g. 22:00-06:00
}

// A critical alert always gets through: quiet hours and the severity floor never hide an emergency.
export function recipientsFor(
  alert: { type: AlertKind; severity: Severity },
  members: Member[],
  nowMs: number,
): { user_id: string; channel: Channel }[] {
  const out: { user_id: string; channel: Channel }[] = [];
  for (const m of members) {
    const p = m.prefs ?? DEFAULT_PREFS;
    const critical = alert.severity === "critical";
    if (!critical && RANK[alert.severity] < RANK[p.min_severity]) continue;
    if (!critical && !p.types.includes(alert.type)) continue;
    if (!critical && inQuietHours(p, nowMs)) continue;
    const channels = p.channels.length ? p.channels : DEFAULT_PREFS.channels;
    for (const channel of new Set(channels)) out.push({ user_id: m.user_id, channel });
  }
  return out;
}
