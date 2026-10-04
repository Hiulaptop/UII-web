import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dosesForDate, hhmm, MAX_SCHEDULES, vnDate, type Dose, type ScheduleInput } from "./schedule";

export type ScheduleRow = {
  id: string;
  name: string;
  dosage: string | null;
  times: string[];
  days: number[];
  start_date: string;
  end_date: string | null;
  remind: boolean;
  lead_minutes: number;
  calendar_event_ids: Record<string, string>;
};

const COLS = "id, name, dosage, times, days, start_date, end_date, remind, lead_minutes, calendar_event_ids";

const normalize = (r: ScheduleRow): ScheduleRow => ({ ...r, times: r.times.map(hhmm) });

export async function listSchedules(userId: string): Promise<ScheduleRow[]> {
  const { data, error } = await supabaseAdmin().from("medication_schedules").select(COLS).eq("user_id", userId).order("created_at");
  if (error) throw new Error(error.message);
  return (data as ScheduleRow[]).map(normalize);
}

export async function getSchedule(userId: string, id: string): Promise<ScheduleRow | null> {
  const { data, error } = await supabaseAdmin().from("medication_schedules").select(COLS).eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalize(data as ScheduleRow) : null;
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: "limit" | "not_found" };

export async function saveSchedule(userId: string, id: string | null, v: ScheduleInput): Promise<SaveResult> {
  const db = supabaseAdmin();
  const row = { name: v.name, dosage: v.dosage, times: v.times, days: v.days, start_date: v.start_date, end_date: v.end_date, remind: v.remind, lead_minutes: v.lead_minutes };
  if (id) {
    // The event ids belong to the old shape of the schedule; the calendar sync rewrites them afterwards.
    const { data, error } = await db.from("medication_schedules").update(row).eq("id", id).eq("user_id", userId).select("id");
    if (error) throw new Error(error.message);
    return data?.length ? { ok: true, id } : { ok: false, error: "not_found" };
  }
  const count = await db.from("medication_schedules").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (count.error) throw new Error(count.error.message);
  if ((count.count ?? 0) >= MAX_SCHEDULES) return { ok: false, error: "limit" };
  const ins = await db.from("medication_schedules").insert({ ...row, user_id: userId }).select("id").single();
  if (ins.error) throw new Error(ins.error.message);
  return { ok: true, id: ins.data.id as string };
}

export async function deleteSchedule(userId: string, id: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin().from("medication_schedules").delete().eq("id", id).eq("user_id", userId).select("id");
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}

/** Today's doses (Vietnam date) with what has already been logged. */
export async function listToday(userId: string, nowMs = Date.now()): Promise<{ date: string; doses: Dose[] }> {
  const date = vnDate(nowMs);
  const schedules = await listSchedules(userId);
  if (!schedules.length) return { date, doses: [] };
  const from = new Date(Date.parse(date + "T00:00:00+07:00")).toISOString();
  const to = new Date(Date.parse(date + "T00:00:00+07:00") + 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin()
    .from("medication_logs")
    .select("schedule_id, scheduled_for, taken_at")
    .eq("user_id", userId)
    .gte("scheduled_for", from)
    .lt("scheduled_for", to);
  if (error) throw new Error(error.message);
  return { date, doses: dosesForDate(schedules, date, data as { schedule_id: string; scheduled_for: string; taken_at: string }[]) };
}

/** Records a dose as taken. Only a dose that is really due today can be recorded; a repeat press changes nothing. */
export async function markTaken(userId: string, scheduleId: string, time: string, nowMs = Date.now()): Promise<"ok" | "not_due"> {
  const { doses } = await listToday(userId, nowMs);
  const dose = doses.find((d) => d.scheduleId === scheduleId && d.time === time);
  if (!dose) return "not_due";
  if (dose.takenAt) return "ok";
  const { error } = await supabaseAdmin()
    .from("medication_logs")
    .upsert({ schedule_id: scheduleId, user_id: userId, scheduled_for: dose.scheduledFor, taken_at: new Date(nowMs).toISOString() }, { onConflict: "schedule_id,scheduled_for", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return "ok";
}
