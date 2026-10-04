import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createExistsCache } from "@/lib/session-check";
import { supabaseAdmin } from "@/lib/supabase/admin";

const GOOGLE_SCOPES = ["openid", "email", "profile"].join(" ");

async function upsertUser(googleSub: string, email: string, name?: string | null, avatarUrl?: string | null) {
  const { data, error } = await supabaseAdmin()
    .from("users")
    .upsert(
      { google_sub: googleSub, email: email.toLowerCase(), name: name ?? null, avatar_url: avatarUrl ?? null },
      { onConflict: "google_sub" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** A session outlives the account it was issued for, so the user row is looked up again (cached for five minutes). */
export const sessionUsers = createExistsCache(async (id) => {
  const { data, error } = await supabaseAdmin().from("users").select("id").eq("id", id).maybeSingle();
  return error ? true : Boolean(data); // if the database is unreachable, do not log everybody out
}, 5 * 60_000);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: { scope: GOOGLE_SCOPES, access_type: "offline", prompt: "consent" },
      },
    }),
  ],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.uid = await upsertUser(account.providerAccountId, token.email!, token.name, token.picture);
        return token;
      }
      if (token.uid && !(await sessionUsers.exists(token.uid as string))) return null; // account deleted: end the session
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      if (token.uid) session.user.id = token.uid;
      return session;
    },
  },
});
