// proxy.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const path = req.nextUrl.pathname;

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  const isAllowed =
    (path.startsWith("/admin") && role === "ADMIN") ||
    (path.startsWith("/teacher") && role === "TEACHER") ||
    (path.startsWith("/student") && role === "STUDENT");

  if (!isAllowed) {
    const home =
      role === "ADMIN" ? "/admin" : role === "TEACHER" ? "/teacher" : "/student";
    return NextResponse.redirect(new URL(home, req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*"],
};