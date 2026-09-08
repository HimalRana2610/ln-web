import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/client";
import {
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
} from "@/lib/auth/session";

/**
 * Ends the session on the server, then clears the cookies.
 *
 * The backend call is best-effort: if it fails the cookies are still cleared, so
 * the user is never stuck in a half-signed-in state on this device.
 */
export async function POST(): Promise<NextResponse> {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);

  if (accessToken) {
    try {
      await apiFetch<void>("/auth/logout", {
        method: "POST",
        accessToken,
        body: { refresh_token: refreshToken ?? null },
      });
    } catch {
      // Ignore: clearing cookies below is what the user actually asked for.
    }
  }

  await clearSessionCookies();
  return new NextResponse(null, { status: 204 });
}
