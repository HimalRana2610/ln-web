"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js`, which keeps opened notes readable offline.
 *
 * Production only: in development a caching worker serves stale bundles and
 * makes hot reload look broken. Renders nothing.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline reading is a nicety; the app works without it.
    });
  }, []);

  return null;
}

/**
 * Drops every cached page. Called on sign-out and account deletion, because
 * cached notes belong to the person who opened them.
 */
export async function clearOfflineCache(): Promise<void> {
  if (typeof caches === "undefined") return;
  const keys = await caches.keys();
  await Promise.all(
    keys.filter((key) => key.startsWith("ln-")).map((key) => caches.delete(key)),
  );
}
