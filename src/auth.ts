import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const GOOGLE_SCOPES = ["openid", "email", "profile"].join(" ");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: { scope: GOOGLE_SCOPES, access_type: "offline", prompt: "consent" },
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
