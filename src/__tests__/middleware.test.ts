import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "../middleware";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookie-names";

/**
 * The session cookies have very different lifetimes — 15 minutes for access,
 * 30 days for refresh — so there is a long window where one exists and the
 * other does not. Treating "has a refresh cookie" as "signed in", while the
 * `(app)` layout required a usable *access* token, produced an infinite
 * redirect loop for every returning visitor after 15 minutes.
 *
 * These tests pin the decision table so that cannot come back.
 */

interface Cookies {
  access?: boolean;
  refresh?: boolean;
}

function request(path: string, cookies: Cookies = {}): NextRequest {
  const jar: string[] = [];
  if (cookies.access) jar.push(`${ACCESS_COOKIE}=access-token`);
  if (cookies.refresh) jar.push(`${REFRESH_COOKIE}=refresh-token`);

  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: jar.length ? { cookie: jar.join("; ") } : undefined,
  });
}

/** The Location header, or null when the request was allowed through. */
function redirectTarget(path: string, cookies: Cookies = {}): string | null {
  const response = middleware(request(path, cookies));
  const location = response.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : null;
}

describe("protected routes", () => {
  it("sends a visitor with no session to login, remembering the destination", () => {
    expect(redirectTarget("/dashboard")).toBe("/login?next=%2Fdashboard");
  });

  it("renews when the access cookie has lapsed but the session is alive", () => {
    // The regression. Previously this redirected to /dashboard, which bounced
    // back to /login, which bounced back here — forever.
    expect(redirectTarget("/dashboard", { refresh: true })).toBe(
      "/api/auth/session-refresh?next=%2Fdashboard",
    );
  });

  it("preserves the query string through renewal, so deep links survive", () => {
    expect(redirectTarget("/dashboard?tab=public", { refresh: true })).toBe(
      "/api/auth/session-refresh?next=%2Fdashboard%3Ftab%3Dpublic",
    );
  });

  it("lets a fully signed-in visitor straight through", () => {
    expect(redirectTarget("/dashboard", { access: true, refresh: true })).toBeNull();
  });
});

describe("auth routes", () => {
  it("renders login for a signed-out visitor", () => {
    expect(redirectTarget("/login")).toBeNull();
  });

  it("renders login when only a refresh cookie remains", () => {
    // The state a stale or revoked session leaves behind. Redirecting to the
    // dashboard here is precisely what created the loop, because the dashboard
    // could not honour it.
    expect(redirectTarget("/login", { refresh: true })).toBeNull();
  });

  it("sends a fully signed-in visitor to the dashboard", () => {
    expect(redirectTarget("/login", { access: true, refresh: true })).toBe("/dashboard");
  });

  it("applies the same rules to register", () => {
    expect(redirectTarget("/register", { access: true, refresh: true })).toBe("/dashboard");
    expect(redirectTarget("/register", { refresh: true })).toBeNull();
  });
});

describe("no state can loop", () => {
  const paths = ["/dashboard", "/login", "/register"];
  const states: Cookies[] = [
    {},
    { refresh: true },
    { access: true },
    { access: true, refresh: true },
  ];

  it("never redirects a path to itself", () => {
    for (const path of paths) {
      for (const state of states) {
        const target = redirectTarget(path, state);
        expect(target?.split("?")[0]).not.toBe(path);
      }
    }
  });

  it("always resolves within two hops", () => {
    // Follow the chain the middleware alone would produce. Anything reaching
    // the renewal route is handed to a route handler, which terminates.
    for (const path of paths) {
      for (const state of states) {
        let current: string | null = path;
        let hops = 0;

        while (current && hops < 5) {
          if (current.startsWith("/api/")) break;
          const next: string | null = redirectTarget(current, state);
          if (!next) break;
          current = next;
          hops += 1;
        }

        expect(hops).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe("path header", () => {
  it("exposes the current path so the layout can return the visitor to it", () => {
    const response = middleware(request("/dashboard", { access: true, refresh: true }));
    expect(response.headers.get("x-middleware-request-x-pathname")).toBe("/dashboard");
  });
});
