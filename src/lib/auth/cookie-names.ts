/**
 * Cookie names, isolated from `session.ts`.
 *
 * `session.ts` is marked `server-only` and pulls in `next/headers`, neither of
 * which the Edge middleware runtime can load. Keeping the names here lets
 * middleware and server code agree without middleware importing Node-only code.
 */

export const ACCESS_COOKIE = "ln_access";
export const REFRESH_COOKIE = "ln_refresh";

/**
 * Set for a few seconds by `/api/auth/session-refresh` when a refresh fails.
 *
 * Its only job is to bound retries: if a refresh attempt lands back on that
 * route while this cookie is still present, the session is dropped instead of
 * being retried, so a broken session can never become a redirect loop.
 */
export const REFRESH_ATTEMPT_COOKIE = "ln_refresh_attempt";
