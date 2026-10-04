import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authSecret, oauthClient } from "./oauth";
import { decryptSecret, encryptSecret } from "./secrets";

export type Connection = {
  providerEmail: string | null;
  calendarId: string | null;
  connectedAt: string;
  lastSyncAt: string | null;
  lastError: string | null;
};

/** The connection's public facts. The refresh token never leaves this module in readable form. */
export async function getConnection(userId: string): Promise<Connection | null> {
  const { data, error } = await supabaseAdmin()
    .from("google_connections")
    .select("provider_email, calendar_id, connected_at, last_sync_at, last_error")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    // Before migration 0006 the table does not exist; the pages must still load and say "not connected".
    if (error.code === "PGRST205" || error.code === "42P01") return null;
    throw new Error(error.message);
  }
  return data
    ? { providerEmail: data.provider_email, calendarId: data.calendar_id, connectedAt: data.connected_at, lastSyncAt: data.last_sync_at, lastError: data.last_error }
    : null;
}

export async function saveConnection(userId: string, c: { email: string | null; scopes: string; refreshToken: string; calendarId: string }) {
  const { error } = await supabaseAdmin().from("google_connections").upsert({
    user_id: userId,
    provider_email: c.email,
    scopes: c.scopes,
    refresh_token_enc: encryptSecret(c.refreshToken, authSecret()),
    calendar_id: c.calendarId,
    connected_at: new Date().toISOString(),
    last_sync_at: null,
    last_error: null,
  });
  if (error) throw new Error(error.message);
}

export async function updateConnection(userId: string, patch: { calendar_id?: string; last_sync_at?: string; last_error?: string | null }) {
  const { error } = await supabaseAdmin().from("google_connections").update(patch).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteConnection(userId: string) {
  const { error } = await supabaseAdmin().from("google_connections").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** An OAuth client that can act as the user: it refreshes access tokens from the stored refresh token by itself. */
export async function authedClient(userId: string) {
  const { data, error } = await supabaseAdmin().from("google_connections").select("refresh_token_enc, calendar_id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const client = oauthClient();
  client.setCredentials({ refresh_token: decryptSecret(data.refresh_token_enc as string, authSecret()) });
  return { client, calendarId: data.calendar_id as string | null };
}
