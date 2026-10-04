// Pure rules for medication schedules. No path aliases and no server-only imports: they run in tests and in the browser.
import { z } from "zod";

export const MAX_SCHEDULES = 20;
export const MAX_TIMES = 8;
const VN_OFFSET = "+07:00";
const VN_OFFSET_MS = 7 * 3_600_000;

export const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const; // index 0 = ISO day 1 (Monday)

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: string) => dateRe.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z")) && new Date(s + "T00:00:00Z").toISOString().startsWith(s);

export const scheduleSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    dosage: z.string().trim().max(60).transform((s) => s || null),
    times: z.array(z.string().regex(timeRe)).min(1).max(MAX_TIMES),
    days: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    start_date: z.string().refine(validDate),
    end_date: z.string().transform((s) => s.trim() || null).refine((s) => s === null || validDate(s)),
    remind: z.boolean(),
    lead_minutes: z.union([z.literal(0), z.literal(10)]),
  })
  .refine((v) => v.end_date === null || v.end_date >= v.start_date, { message: "end_before_start" })
  .transform((v) => ({
    ...v,
    times: [...new Set(v.times)].sort(),
    days: [...new Set(v.days)].sort((a, b) => a - b),
  }));

export type ScheduleInput = z.output<typeof scheduleSchema>;

type FormLike = { get(k: string): unknown; getAll(k: string): unknown[] };
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function parseScheduleForm(f: FormLike) {
  return scheduleSchema.safeParse({
    name: str(f.get("name")),
    dosage: str(f.get("dosage")),
    times: f.getAll("time").map(str),
    days: f.getAll("day").map((d) => Number(str(d))),
    start_date: str(f.get("start_date")),
    end_date: str(f.get("end_date")),
    remind: f.get("remind") === "on",
    lead_minutes: Number(str(f.get("lead_minutes"))) === 10 ? 10 : 0,
  });
}

// ---------- calendar days in Vietnam time ----------

export const vnDate = (nowMs: number) => new Date(nowMs + VN_OFFSET_MS).toISOString().slice(0, 10);

/** ISO weekday (1 = Monday .. 7 = Sunday) of a "YYYY-MM-DD" date. */
export function isoWeekday(date: string): number {
  const d = new Date(date + "T00:00:00Z").getUTCDay();
  return d === 0 ? 7 : d;
}

export const addDays = (date: string, n: number) => new Date(Date.parse(date + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

/** The instant of a dose: a Vietnam-local date and time as an ISO string with offset. */
export const doseInstant = (date: string, time: string) => new Date(`${date}T${time}:00${VN_OFFSET}`).toISOString();

type Window = { days: number[]; start_date: string; end_date: string | null };

/** Whether a schedule has doses on a given date. */
export function activeOn(s: Window, date: string): boolean {
  return date >= s.start_date && (s.end_date === null || date <= s.end_date) && s.days.includes(isoWeekday(date));
}

/** First date on or after the start that is one of the chosen weekdays (a recurring event must begin on one). */
export function firstDoseDate(s: Window): string {
  for (let i = 0; i < 7; i++) {
    const d = addDays(s.start_date, i);
    if (s.days.includes(isoWeekday(d))) return d;
  }
  return s.start_date;
}

export function daysSummary(days: number[]): string {
  if (days.length === 7) return "Hằng ngày";
  return days.map((d) => DAY_LABELS[d - 1]).join(", ");
}

export const hhmm = (t: string) => t.slice(0, 5);

export type Dose = { scheduleId: string; label: string; time: string; scheduledFor: string; takenAt: string | null };

/** The doses due on a date, in time order, marked with the log of the ones already taken. */
export function dosesForDate(
  schedules: { id: string; name: string; dosage: string | null; times: string[]; days: number[]; start_date: string; end_date: string | null }[],
  date: string,
  logs: { schedule_id: string; scheduled_for: string; taken_at: string }[],
): Dose[] {
  const taken = new Map(logs.map((l) => [`${l.schedule_id}|${Date.parse(l.scheduled_for)}`, l.taken_at]));
  const out: Dose[] = [];
  for (const s of schedules) {
    if (!activeOn(s, date)) continue;
    for (const t of s.times.map(hhmm)) {
      const scheduledFor = doseInstant(date, t);
      out.push({
        scheduleId: s.id,
        label: [s.name, s.dosage].filter(Boolean).join(" "),
        time: t,
        scheduledFor,
        takenAt: taken.get(`${s.id}|${Date.parse(scheduledFor)}`) ?? null,
      });
    }
  }
  return out.sort((a, b) => a.time.localeCompare(b.time) || a.label.localeCompare(b.label));
}
