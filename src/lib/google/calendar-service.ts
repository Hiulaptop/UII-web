import "server-only";
import { removeScheduleEvents, syncSchedule } from "@/lib/medication/calendar-sync";
import { getSchedule, listSchedules, type ScheduleRow } from "@/lib/medication/service";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { googleGateway } from "./calendar-gateway";
import { authedClient, deleteConnection, updateConnection } from "./connection";

export type SyncOutcome = { ok: true } | { ok: false; error: "not_connected" | "reconnect" | "failed" };

/** Short, safe error class for the database and the page: Google's messages can contain account details. */
function classify(e: unknown): "reconnect" | "failed" {
  const text = String((e as { message?: string })?.message ?? "");
  const code = (e as { code?: number | string })?.code;
  return text.includes("invalid_grant") || code === 401 || code === 403 ? "reconnect" : "failed";
}

async function setEventIds(scheduleId: string, ids: Record<string, string>) {
  const { error } = await supabaseAdmin().from("medication_schedules").update({ calendar_event_ids: ids }).eq("id", scheduleId);
  if (error) throw new Error(error.message);
}

/** Syncs one schedule and stores the ids; if it fails half way, the ids created so far are stored before the error goes on. */
async function syncAndStore(gw: ReturnType<typeof googleGateway>, calendarId: string, s: ScheduleRow) {
  try {
    await setEventIds(s.id, await syncSchedule(gw, calendarId, s, s.calendar_event_ids ?? {}));
  } catch (e) {
    const partial = (e as { partialIds?: Record<string, string> }).partialIds;
    if (partial) await setEventIds(s.id, partial).catch(() => {});
    throw e;
  }
}

async function withGateway<T>(userId: string, fn: (gw: ReturnType<typeof googleGateway>, calendarId: string) => Promise<T>): Promise<T | "not_connected"> {
  const auth = await authedClient(userId);
  if (!auth) return "not_connected";
  const gw = googleGateway(auth.client);
  const calendarId = await gw.ensureCalendar(auth.calendarId);
  if (calendarId !== auth.calendarId) await updateConnection(userId, { calendar_id: calendarId });
  return fn(gw, calendarId);
}

const fail = async (userId: string, e: unknown): Promise<SyncOutcome> => {
  const error = classify(e);
  console.error("[calendar] sync failed:", error);
  await updateConnection(userId, { last_error: error }).catch(() => {});
  return { ok: false, error };
};

/** Brings one schedule's Google events in line with it (creates, updates or removes them). */
export async function syncOne(userId: string, scheduleId: string): Promise<SyncOutcome> {
  try {
    const s = await getSchedule(userId, scheduleId);
    if (!s) return { ok: true };
    const r = await withGateway(userId, (gw, calendarId) => syncAndStore(gw, calendarId, s));
    if (r === "not_connected") return { ok: false, error: "not_connected" };
    await updateConnection(userId, { last_sync_at: new Date().toISOString(), last_error: null });
    return { ok: true };
  } catch (e) {
    return fail(userId, e);
  }
}

export async function syncAll(userId: string): Promise<SyncOutcome> {
  try {
    const schedules = await listSchedules(userId);
    const r = await withGateway(userId, async (gw, calendarId) => {
      for (const s of schedules) await syncAndStore(gw, calendarId, s);
    });
    if (r === "not_connected") return { ok: false, error: "not_connected" };
    await updateConnection(userId, { last_sync_at: new Date().toISOString(), last_error: null });
    return { ok: true };
  } catch (e) {
    return fail(userId, e);
  }
}

/** Called before a schedule is deleted, so its events do not stay behind in the user's calendar. */
export async function removeFor(userId: string, s: Pick<ScheduleRow, "calendar_event_ids">): Promise<void> {
  if (!Object.keys(s.calendar_event_ids ?? {}).length) return;
  try {
    await withGateway(userId, (gw, calendarId) => removeScheduleEvents(gw, calendarId, s.calendar_event_ids));
  } catch (e) {
    await fail(userId, e);
  }
}

/** Revokes the grant. With `deleteCalendar` the "UII – Thuốc" calendar and every reminder in it are deleted too. */
export async function disconnect(userId: string, deleteCalendar: boolean): Promise<void> {
  // A token that can no longer be read (secret rotated, row damaged) must not stop the user from disconnecting.
  const auth = await authedClient(userId).catch(() => null);
  if (auth) {
    if (deleteCalendar && auth.calendarId) {
      try { await googleGateway(auth.client).deleteCalendar(auth.calendarId); } catch (e) { console.error("[calendar] calendar not deleted:", classify(e)); }
    }
    try {
      const t = auth.client.credentials.refresh_token;
      if (t) await auth.client.revokeToken(t);
    } catch (e) {
      console.error("[calendar] token not revoked:", classify(e));
    }
  }
  await deleteConnection(userId);
  // Without a connection no reminder can exist: reflect that on the schedules.
  const { error } = await supabaseAdmin().from("medication_schedules").update({ remind: false, calendar_event_ids: {} }).eq("user_id", userId);
  if (error) throw new Error(error.message);
}
