// Pure: turns a schedule into the recurring Google Calendar events that remind the user. Tested without Google.
import { firstDoseDate, hhmm } from "./schedule.ts";

const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const TZ = "Asia/Ho_Chi_Minh";
export const CALENDAR_NAME = "UII – Thuốc";
export const EVENT_MINUTES = 15;

export type EventSource = {
  name: string;
  dosage: string | null;
  times: string[];
  days: number[];
  start_date: string;
  end_date: string | null;
  lead_minutes: number;
};

export type CalendarEvent = {
  /** The dose time this event belongs to ("HH:MM"), used as the key when updating. */
  key: string;
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  recurrence: string[];
  reminders: { useDefault: false; overrides: { method: "popup"; minutes: number }[] };
  /** For the preview card: the clock time the event starts at. */
  startsAt: string;
};

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** RRULE UNTIL is UTC: the end date's last second in Vietnam time (UTC+7). */
export function untilUtc(endDate: string): string {
  const t = Date.parse(`${endDate}T23:59:59+07:00`);
  return new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildEvents(s: EventSource): CalendarEvent[] {
  const first = firstDoseDate(s);
  const byday = s.days.map((d) => BYDAY[d - 1]).join(",");
  const rule = `RRULE:FREQ=WEEKLY;BYDAY=${byday}${s.end_date ? `;UNTIL=${untilUtc(s.end_date)}` : ""}`;
  const label = [s.name, s.dosage].filter(Boolean).join(" ");

  return [...new Set(s.times.map(hhmm))].sort().map((t) => {
    // An early reminder is an event that starts earlier; it cannot slip before midnight (that would change the day).
    const startMin = Math.max(0, minutes(t) - s.lead_minutes);
    const endMin = Math.min(24 * 60 - 1, startMin + EVENT_MINUTES);
    const local = (m: number) => `${first}T${clock(m)}:00`;
    return {
      key: t,
      summary: label,
      description: `Uống lúc ${t}${s.lead_minutes ? ` (nhắc trước ${s.lead_minutes} phút)` : ""}. Tạo bởi UII.`,
      start: { dateTime: local(startMin), timeZone: TZ },
      end: { dateTime: local(endMin), timeZone: TZ },
      recurrence: [rule],
      reminders: { useDefault: false as const, overrides: [{ method: "popup" as const, minutes: 0 }] },
      startsAt: clock(startMin),
    };
  });
}

/** Text of the preview card: "07:50  Levetiracetam 500mg (nhắc trước 10 phút)". */
export function previewLine(e: CalendarEvent, leadMinutes: number) {
  return `${e.summary}${leadMinutes ? ` (nhắc trước ${leadMinutes} phút)` : ""}`;
}
