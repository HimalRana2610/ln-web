"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

interface LocalTimeProps {
  iso: string;
  /** Include the time of day, not just the date. */
  withTime?: boolean;
  className?: string;
}

/**
 * A timestamp in the *viewer's* timezone.
 *
 * Formatting during server rendering would use the server's zone — UTC on
 * Vercel — so a 23:59 Kathmandu deadline would read 18:14 to everyone. The
 * server snapshot is therefore empty and the real value appears only once the
 * browser, which knows the viewer's zone, renders. `useSyncExternalStore` is
 * what makes that a clean second render instead of a hydration mismatch.
 */
export function LocalTime({ iso, withTime = false, className }: LocalTimeProps) {
  const formatted = useSyncExternalStore(
    noop,
    () => formatLocal(iso, withTime),
    () => null,
  );

  return (
    <time dateTime={iso} className={className}>
      {formatted ?? " "}
    </time>
  );
}

/**
 * The current time to the minute, or null during server rendering.
 *
 * Minute granularity keeps the snapshot stable between renders, which
 * `useSyncExternalStore` requires — `Date.now()` itself would loop forever.
 */
export function useNowMinute(): Date | null {
  const minute = useSyncExternalStore(
    noop,
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
  return minute === null ? null : new Date(minute * 60_000);
}

export function formatLocal(iso: string, withTime: boolean): string {
  const date = new Date(iso);
  return withTime
    ? date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}
