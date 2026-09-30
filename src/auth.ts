import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase/admin";

const GOOGLE_SCOPES = ["openid", "email", "profile"].join(" ");

async function upsertUser(googleSub: string, email: string, name?: string | null, avatarUrl?: string | null) {
  const { data, error } = await supabaseAdmin()
    .from("users")
    .upsert(
      { google_sub: googleSub, email, name: name ?? null, avatar_url: avatarUrl ?? null },
      { onConflict: "google_sub" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

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
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      if (token.uid) session.user.id = token.uid;
      return session;
    },
  },
});
