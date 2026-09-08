/**
 * Server-side session handling.
 *
 * Tokens live in httpOnly cookies. Only route handlers and server actions may
 * write cookies in the App Router, so `setSessionCookies` / `clearSessionCookies`
 * are called from `/api/auth/*`; server components only ever read.
 */

import "server-only";

import { cookies } from "next/headers";

import { ApiError, apiFetch } from "@/lib/api/client";
import type { TokenPair, User } from "@/lib/api/types";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookie-names";
import { serverEnv } from "@/lib/env";

export { ACCESS_COOKIE, REFRESH_COOKIE };

const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // mirrors the backend default

const baseCookieOptions = {
  httpOnly: true,
  secure: serverEnv.isProduction,
  // "lax" still sends the cookie on top-level navigation, so returning from an
  // OAuth redirect keeps the session, while blocking cross-site POST forgery.
  sameSite: "lax" as const,
  path: "/",
};

export async function setSessionCookies(tokens: TokenPair): Promise<void> {
  const store = await cookies();

  store.set(ACCESS_COOKIE, tokens.access_token, {
    ...baseCookieOptions,
    maxAge: tokens.expires_in,
  });
  store.set(REFRESH_COOKIE, tokens.refresh_token, {
    ...baseCookieOptions,
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

/**
 * The signed-in user, or null.
 *
 * Returns null rather than throwing on 401 so layouts can decide whether to
 * redirect. It cannot refresh the token itself — server components may not set
 * cookies — so `<SessionKeeper />` renews the access cookie from the client
 * before it expires.
 */
export async function getCurrentUser(): Promise<User | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    return await apiFetch<User>("/users/me", { accessToken });
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) return null;
    throw error;
  }
}
