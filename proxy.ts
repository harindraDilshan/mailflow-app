import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Optimistic check only: no session cookie on a private page -> the log-in page, with a link back.
 * It does not call Appwrite (the proxy runs on every request, also on prefetches).
 * The real check is requireUser() in lib/auth.ts, in every page, action, and route handler.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();
  // Server actions answer with their own redirect (requireUser), so do not redirect their POST here.
  if (request.headers.has("next-action")) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (request.nextUrl.pathname === "/login/verify") {
    url.searchParams.set("reason", "expired"); // the code page without a session: log in again
  } else {
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/contacts/:path*",
    "/campaigns/:path*",
    "/templates/:path*",
    "/automations/:path*",
    "/domains/:path*",
    "/developers/:path*",
    "/settings/:path*",
    "/ui-showcase/:path*",
    "/login/verify",
  ],
};
