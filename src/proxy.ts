import { auth } from "@/auth";

export const proxy = auth((req) => {
  if (!req.auth) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return Response.redirect(login);
  }
});

export const config = { matcher: ["/dashboard/:path*", "/circle/:path*", "/reports/:path*", "/alerts/:path*", "/devices/:path*", "/profile/:path*", "/settings/:path*"] };
