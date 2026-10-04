import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveConnection } from "@/lib/google/connection";
import { googleGateway } from "@/lib/google/calendar-gateway";
import { authSecret, CALENDAR_SCOPE, oauthClient } from "@/lib/google/oauth";
import { checkState, emailFromIdToken } from "@/lib/google/secrets";
import { syncAll } from "@/lib/google/calendar-service";
import { appUrl } from "@/lib/invites";

export const dynamic = "force-dynamic";

const back = (q: string) => NextResponse.redirect(`${appUrl()}/settings/google?${q}`);

export async function GET(req: Request) {
  const uid = (await auth())?.user?.id;
  if (!uid) return NextResponse.redirect(`${appUrl()}/login?callbackUrl=%2Fsettings%2Fgoogle`);

  const url = new URL(req.url);
  if (url.searchParams.get("error")) return back("status=denied"); // the user pressed "Cancel" at Google
  if (!checkState(url.searchParams.get("state"), uid, authSecret())) return back("status=invalid");
  const code = url.searchParams.get("code");
  if (!code) return back("status=invalid");

  try {
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    const granted = (tokens.scope ?? "").split(" ");
    // The user can untick the permission on Google's screen; without it there is nothing to connect.
    if (!granted.includes(CALENDAR_SCOPE)) return back("status=denied");
    if (!tokens.refresh_token) return back("status=failed");

    client.setCredentials(tokens);
    const calendarId = await googleGateway(client).ensureCalendar(null);
    await saveConnection(uid, { email: emailFromIdToken(tokens.id_token), scopes: tokens.scope ?? CALENDAR_SCOPE, refreshToken: tokens.refresh_token, calendarId });
    await syncAll(uid); // reminders that were set up before connecting
    return back("status=connected");
  } catch (e) {
    console.error("[calendar] connect failed:", (e as { code?: unknown })?.code ?? "error");
    return back("status=failed");
  }
}
