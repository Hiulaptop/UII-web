import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { authSecret, authUrl } from "@/lib/google/oauth";
import { makeState } from "@/lib/google/secrets";

export const dynamic = "force-dynamic";

// Starts Google's consent screen for the one calendar permission UII asks for. Signed-in users only.
export async function GET(req: Request) {
  const uid = (await auth())?.user?.id;
  if (!uid) return NextResponse.redirect(new URL("/login?callbackUrl=%2Fsettings%2Fgoogle", req.url));
  return NextResponse.redirect(authUrl(makeState(uid, authSecret())));
}
