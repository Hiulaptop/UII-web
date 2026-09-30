import { google } from "googleapis";

export function getGoogleClient(accessToken: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET,
  );
  oauth2.setCredentials({ access_token: accessToken });
  return oauth2;
}

export function getCalendar(accessToken: string) {
  return google.calendar({ version: "v3", auth: getGoogleClient(accessToken) });
}
