import "server-only";

import { notFound } from "next/navigation";

import { ApiError } from "@/lib/api/client";

/**
 * Run a backend read, turning a 404 into Next's not-found page.
 *
 * Exists so pages can keep `try/catch` away from their JSX. Constructing
 * elements inside a `try` block is flagged by `react-hooks/error-boundaries`:
 * a render that throws part-way leaves React unable to recover cleanly, and an
 * error boundary is the right tool for that, not a `catch`.
 *
 * The backend answers 404 rather than 403 for a classroom you are not in, so a
 * stranger cannot distinguish a real id from an invented one.
 */
export async function fetchOr404<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
