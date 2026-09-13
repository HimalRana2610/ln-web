/*
  Offline support for LectureNote AI.

  Deliberately small (see docs/phase-6-supporting-features.md, "do not
  gold-plate"): it makes previously opened notes readable without a
  connection, and nothing else. There are no offline writes.

  - /_next/static/* is content-hashed, so it is cached forever on first use.
  - Note pages are network-first: always fresh when online, the last copy
    when not.
  - Any other navigation that fails shows /offline.html.
  - API routes and Server Actions (POST) are never touched.
*/

const VERSION = "v1";
const STATIC_CACHE = `ln-static-${VERSION}`;
const PAGES_CACHE = `ln-pages-${VERSION}`;
const OFFLINE_URL = "/offline.html";

const NOTE_PAGE = /^\/classroom\/[^/]+\/notes\/[^/]+\/?$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("ln-") && ![STATIC_CACHE, PAGES_CACHE].includes(key),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      NOTE_PAGE.test(url.pathname) ? networkFirstNote(request) : networkOrOffline(request),
    );
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNote(request) {
  try {
    const response = await fetch(request);
    // Redirects (e.g. to /login) are not the note; never cache them.
    if (response.ok && !response.redirected) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request, { ignoreSearch: true })) ?? offlinePage();
  }
}

async function networkOrOffline(request) {
  try {
    return await fetch(request);
  } catch {
    return offlinePage();
  }
}

async function offlinePage() {
  return (await caches.match(OFFLINE_URL)) ?? new Response("Offline", { status: 503 });
}
