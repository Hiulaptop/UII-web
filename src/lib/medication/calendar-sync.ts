// Decides which Google events to create, update or delete for a schedule. The Google API itself is behind an
// interface, so this logic is tested with a fake and never needs a network.
import { buildEvents, type CalendarEvent, type EventSource } from "./calendar-events.ts";

export interface CalendarGateway {
  /** Returns the id of the "UII – Thuốc" calendar, creating it if the stored id is missing or was deleted by the user. */
  ensureCalendar(existingId: string | null): Promise<string>;
  /** Creates (no id) or replaces (id) one recurring event; returns its id. */
  upsertEvent(calendarId: string, event: CalendarEvent, existingEventId?: string): Promise<string>;
  /** Deleting something already gone is not an error. */
  deleteEvent(calendarId: string, eventId: string): Promise<void>;
  deleteCalendar(calendarId: string): Promise<void>;
}

export type SyncSource = EventSource & { remind: boolean };

/** @returns the new "HH:MM" -> event id map to store. */
export async function syncSchedule(
  gw: CalendarGateway,
  calendarId: string,
  s: SyncSource,
  existing: Record<string, string>,
): Promise<Record<string, string>> {
  const wanted = s.remind ? buildEvents(s) : [];
  const keep = new Set(wanted.map((e) => e.key));
  const next: Record<string, string> = {};

  // Events for doses that no longer exist (or reminders switched off) go first, so a failure later cannot leave strays.
  for (const [key, id] of Object.entries(existing)) {
    if (!keep.has(key)) await gw.deleteEvent(calendarId, id);
  }
  try {
    for (const e of wanted) next[e.key] = await gw.upsertEvent(calendarId, e, existing[e.key]);
  } catch (err) {
    // Events already created must be remembered, or the next attempt would create them a second time.
    const stillValid = Object.fromEntries(Object.entries(existing).filter(([k]) => keep.has(k)));
    throw Object.assign(err instanceof Error ? err : new Error(String(err)), { partialIds: { ...stillValid, ...next } });
  }
  return next;
}

export async function removeScheduleEvents(gw: CalendarGateway, calendarId: string, existing: Record<string, string>): Promise<void> {
  for (const id of Object.values(existing)) await gw.deleteEvent(calendarId, id);
}
