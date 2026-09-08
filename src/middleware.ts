import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookie-names";

const AUTH_ROUTES = ["/login", "/register"];
const PROTECTED_ROUTES = ["/dashboard"];

const SESSION_REFRESH_PATH = "/api/auth/session-refresh";

/**
 * Coarse route gating.
 *
 * Deliberately cheap: it runs on every request, so it makes no network call and
 * verifies no signature. Real enforcement is the backend rejecting requests
 * without a valid token, plus the `(app)` layout checking `/users/me`.
 *
 * The subtlety is that the two session cookies have very different lifetimes —
 * 15 minutes for access, 30 days for refresh. Treating "has a refresh cookie"
 * as "signed in" while the layout requires a usable *access* token is what
 * previously produced an infinite redirect loop for anyone returning after 15
 * minutes. So when the refresh cookie outlives the access cookie, the visitor
 * is sent to renew rather than being bounced between the two pages.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  const hasRefresh = request.cookies.has(REFRESH_COOKIE);
  const hasAccess = request.cookies.has(ACCESS_COOKIE);

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected) {
    if (!hasRefresh) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      // Remember where they were headed so login can send them back.
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (!hasAccess) {
      // Session is alive but the short-lived access cookie has lapsed. Renew it
      // in a route handler — the only place that may write cookies — and come
      // straight back.
      const url = request.nextUrl.clone();
      url.pathname = SESSION_REFRESH_PATH;
      url.search = "";
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
  }

  // Signed-in visitors have no use for the login page. Requiring both cookies
  // keeps this consistent with the protected-route check above; with only a
  // refresh cookie the visitor is better served by the renewal route.
  if (isAuthRoute && hasRefresh && hasAccess) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Expose the path so the `(app)` layout can send a visitor back to where they
  // were after renewing. Request headers are not otherwise available to it.
  const headers = new Headers(request.headers);
  headers.set("x-pathname", `${pathname}${search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Skip static assets and API routes entirely.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
