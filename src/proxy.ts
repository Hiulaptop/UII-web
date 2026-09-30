import { auth } from "@/auth";

export const proxy = auth((req) => {
  if (!req.auth) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = { matcher: ["/dashboard/:path*"] };
