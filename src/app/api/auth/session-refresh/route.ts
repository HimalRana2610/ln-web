import { NextResponse, type NextRequest } from "next/server";

import { ApiError, apiFetch } from "@/lib/api/client";
import type { TokenPair } from "@/lib/api/types";
import { REFRESH_ATTEMPT_COOKIE } from "@/lib/auth/cookie-names";
import {
  clearSessionCookies,
  getRefreshToken,
  setSessionCookies,
} from "@/lib/auth/session";

/**
 * Renews the session, then sends the visitor where they were going.
 *
 * This exists because of a structural constraint: the access cookie lives 15
 * minutes and the refresh cookie 30 days, but neither middleware nor a Server
 * Component can write a cookie. Without somewhere to refresh, a visitor
 * returning after 15 minutes has a valid session that nothing is able to renew —
 * middleware sees the refresh cookie and sends them to the dashboard, the
 * dashboard finds no usable access token and sends them to login, forever.
 *
 * A route handler can write cookies, so the redirect lands here instead.
 */

/** How long the loop-guard cookie lives. Long enough for one redirect hop. */
const ATTEMPT_TTL_SECONDS = 15;

/** Only ever redirect within this site, never to a URL a caller supplied. */
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  // An open redirect here would let a phishing link bounce off our domain.
  return raw;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const loginUrl = new URL("/login", request.nextUrl.origin);

  // If a previous attempt just ran and we are back here, refreshing is not
  // fixing anything. Drop the session rather than loop again.
  if (request.cookies.has(REFRESH_ATTEMPT_COOKIE)) {
    await clearSessionCookies();
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(REFRESH_ATTEMPT_COOKIE);
    return response;
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearSessionCookies();
    return NextResponse.redirect(loginUrl);
  }

  try {
    const tokens = await apiFetch<TokenPair>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
    });
    await setSessionCookies(tokens);

    return NextResponse.redirect(new URL(next, request.nextUrl.origin));
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;

    // The refresh token is expired, revoked, or was invalidated by the
    // backend's reuse detection. Clear it so the next request is a clean
    // signed-out state rather than another bounce.
    await clearSessionCookies();

    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(REFRESH_ATTEMPT_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: ATTEMPT_TTL_SECONDS,
    });
    return response;
  }
}
