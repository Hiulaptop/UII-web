import "server-only";
import { google } from "googleapis";
import { appUrl } from "@/lib/invites";

/** Lets UII create and manage only the calendars it created itself: it cannot read the user's other calendars. */
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";

export const redirectUri = () => `${appUrl()}/api/google/calendar/callback`;

export function oauthClient() {
  return new google.auth.OAuth2(process.env.AUTH_GOOGLE_ID, process.env.AUTH_GOOGLE_SECRET, redirectUri());
}

export function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

export function authUrl(state: string) {
  return oauthClient().generateAuthUrl({
    access_type: "offline", // we need a refresh token: reminders are synced while the user is away
    prompt: "consent",
    scope: ["openid", "email", CALENDAR_SCOPE],
    state,
    include_granted_scopes: false,
  });
}
