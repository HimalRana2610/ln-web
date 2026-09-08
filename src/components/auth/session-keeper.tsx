"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

interface SessionKeeperProps {
  /** Access-token lifetime in seconds, from the backend. */
  expiresInSeconds: number;
}

/** Refresh this many seconds before expiry, to absorb clock skew and latency. */
const REFRESH_MARGIN_SECONDS = 60;
const MIN_INTERVAL_MS = 30_000;

/**
 * Keeps the access cookie fresh while the tab is open.
 *
 * Server components can read cookies but not write them, so they cannot refresh
 * an expired token themselves. This client component renews it just before it
 * lapses, which keeps every server render finding a valid token.
 *
 * Renders nothing.
 */
export function SessionKeeper({ expiresInSeconds }: SessionKeeperProps) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch("/api/auth/refresh", { method: "POST" });

        if (!response.ok) {
          // The refresh token is dead (expired, or revoked by reuse detection).
          router.replace("/login");
          router.refresh();
          return;
        }

        const body: { expires_in?: number } = await response.json();
        if (!cancelled) schedule(body.expires_in ?? expiresInSeconds);
      } catch {
        // Offline or a transient failure: retry on the shortest interval rather
        // than signing the user out over a flaky network.
        if (!cancelled) schedule(REFRESH_MARGIN_SECONDS * 2);
      }
    }

    function schedule(seconds: number) {
      const delay = Math.max((seconds - REFRESH_MARGIN_SECONDS) * 1000, MIN_INTERVAL_MS);
      timerRef.current = setTimeout(refresh, delay);
    }

    schedule(expiresInSeconds);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [expiresInSeconds, router]);

  return null;
}
