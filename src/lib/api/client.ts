/**
 * Thin fetch wrapper around the FastAPI backend.
 *
 * Used from server code (route handlers, server components) only — the browser
 * never talks to FastAPI directly. It goes through this app's own `/api/auth/*`
 * route handlers, so tokens can live in httpOnly cookies that JavaScript cannot
 * read. That removes the XSS token-theft problem entirely.
 */

import { serverEnv } from "@/lib/env";

import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Array<{ field: string; message: string }>;

  constructor(status: number, body: ApiErrorBody["error"]) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }

  /** True when the caller should try refreshing the access token. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Bearer token to attach. */
  accessToken?: string;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, accessToken, headers, ...rest } = options;

  const response = await fetch(`${serverEnv.apiBaseUrl}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Auth state is per-request; never let Next cache these.
    cache: "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const envelope = payload as Partial<ApiErrorBody> | null;
    throw new ApiError(
      response.status,
      envelope?.error ?? {
        code: "unknown_error",
        message: `Request failed with status ${response.status}`,
      },
    );
  }

  return payload as T;
}
