import "server-only";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { CALENDAR_NAME, type CalendarEvent } from "@/lib/medication/calendar-events";
import type { CalendarGateway } from "@/lib/medication/calendar-sync";

const gone = (e: unknown) => {
  const code = (e as { code?: number; status?: number })?.code ?? (e as { status?: number })?.status;
  return code === 404 || code === 410;
};

const body = (e: CalendarEvent) => ({ summary: e.summary, description: e.description, start: e.start, end: e.end, recurrence: e.recurrence, reminders: e.reminders });

export function googleGateway(auth: OAuth2Client): CalendarGateway {
  const cal = google.calendar({ version: "v3", auth });
  return {
    async ensureCalendar(existingId) {
      if (existingId) {
        try {
          await cal.calendars.get({ calendarId: existingId });
          return existingId;
        } catch (e) {
          if (!gone(e)) throw e; // the user deleted it: make a new one
        }
      }
      const r = await cal.calendars.insert({ requestBody: { summary: CALENDAR_NAME, timeZone: "Asia/Ho_Chi_Minh" } });
      if (!r.data.id) throw new Error("calendar_not_created");
      return r.data.id;
    },
    async upsertEvent(calendarId, event, existingEventId) {
      if (existingEventId) {
        try {
          const r = await cal.events.update({ calendarId, eventId: existingEventId, requestBody: body(event) });
          return r.data.id ?? existingEventId;
        } catch (e) {
          if (!gone(e)) throw e;
        }
      }
      const r = await cal.events.insert({ calendarId, requestBody: body(event) });
      if (!r.data.id) throw new Error("event_not_created");
      return r.data.id;
    },
    async deleteEvent(calendarId, eventId) {
      try { await cal.events.delete({ calendarId, eventId }); } catch (e) { if (!gone(e)) throw e; }
    },
    async deleteCalendar(calendarId) {
      try { await cal.calendars.delete({ calendarId }); } catch (e) { if (!gone(e)) throw e; }
    },
  };
}
