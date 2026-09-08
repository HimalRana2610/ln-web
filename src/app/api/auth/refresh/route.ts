import { NextResponse } from "next/server";

import { ApiError, apiFetch } from "@/lib/api/client";
import type { TokenPair } from "@/lib/api/types";
import { clearSessionCookies, getRefreshToken, setSessionCookies } from "@/lib/auth/session";

/**
 * Rotates the token pair and rewrites the cookies.
 *
 * Called by `<SessionKeeper />` shortly before the access token expires, so
 * server components almost always find a valid one. A failure here means the
 * refresh token is dead — the backend revokes a whole token family when it
 * detects reuse — so the cookies are cleared and the user signs in again.
 */
export async function POST(): Promise<NextResponse> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return NextResponse.json(
      { error: { code: "no_session", message: "No session to refresh" } },
      { status: 401 },
    );
  }

  try {
    const tokens = await apiFetch<TokenPair>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
    });
    await setSessionCookies(tokens);
    return NextResponse.json({ expires_in: tokens.expires_in });
  } catch (error) {
    if (error instanceof ApiError) {
      await clearSessionCookies();
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    throw error;
  }
}
