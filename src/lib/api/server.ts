/**
 * Authenticated backend calls from server code.
 *
 * Wraps `apiFetch` with the access token from the session cookie, so Server
 * Components and Server Actions never touch cookies or headers themselves.
 */

import "server-only";

import { ApiError, apiFetch } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/session";

type Options = Omit<Parameters<typeof apiFetch>[1] & object, "accessToken">;

/**
 * Calls the backend as the signed-in user.
 *
 * Throws {@link ApiError} with status 401 when there is no session, which the
 * caller turns into a redirect. It deliberately does not refresh: Server
 * Components cannot write cookies, so `<SessionKeeper />` owns renewal.
 */
export async function authedFetch<T>(path: string, options: Options = {}): Promise<T> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new ApiError(401, { code: "no_session", message: "Not signed in" });
  }

  return apiFetch<T>(path, { ...options, accessToken });
}

/**
 * Runs a backend call and narrows failures to a form-friendly result.
 *
 * Server Actions cannot throw arbitrary errors back to the client usefully —
 * Next serialises them into a generic message in production. Returning a
 * discriminated union instead keeps the backend's message intact.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string };

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error: error.message, code: error.code };
    }
    return {
      ok: false,
      error: "Something went wrong. Please try again.",
      code: "unknown_error",
    };
  }
}
