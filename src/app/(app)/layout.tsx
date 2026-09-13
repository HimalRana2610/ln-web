import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SessionKeeper } from "@/components/auth/session-keeper";
import { BrandMark } from "@/components/ui/brand-mark";
import { getCurrentUser, getRefreshToken } from "@/lib/auth/session";

/** Heroicons Cog6Tooth (outline), the old app's settings button. Sign out lives in Settings, as it did there. */
function GearIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="size-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

/**
 * Shell for every signed-in page.
 *
 * Middleware already turned away visitors with no session cookie, but that
 * check only proves a cookie *exists*. This layout verifies the token against
 * the backend, so a forged or revoked cookie still cannot render the app.
 *
 * When verification fails but a refresh cookie survives, the access token has
 * simply lapsed — send the visitor to renew rather than to the login page. A
 * Server Component cannot write cookies, so it cannot refresh here itself, and
 * redirecting to `/login` instead is what produced an infinite loop: middleware
 * would see the refresh cookie and send them straight back.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    const refreshToken = await getRefreshToken();

    if (refreshToken) {
      const pathname = (await headers()).get("x-pathname") ?? "/dashboard";
      redirect(`/api/auth/session-refresh?next=${encodeURIComponent(pathname)}`);
    }

    redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-900">
      {/* Access tokens last 15 minutes; keep the cookie fresh while the tab is open. */}
      <SessionKeeper expiresInSeconds={15 * 60} />

      {/* Dark in both themes, as in the old app — the header is part of its identity. */}
      <header className="bg-slate-900 text-white shadow-lg dark:border-b dark:border-slate-700">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5">
          <Link
            href="/dashboard"
            aria-label="LectureNote AI — all classes"
            className="shrink-0 rounded-xl whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
          >
            <BrandMark />
          </Link>

          <div className="flex items-center gap-1 whitespace-nowrap sm:gap-3">
            <nav aria-label="Main" className="flex items-center text-sm font-medium">
              {/* The logo already leads to the class list; on a phone, room goes to To-do. */}
              <Link
                href="/dashboard"
                className="hidden rounded-lg px-2.5 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white sm:block"
              >
                Classes
              </Link>
              <Link
                href="/todo"
                className="rounded-lg px-2.5 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                To-do
              </Link>
            </nav>

            <div className="hidden flex-col items-end leading-tight md:flex">
              <span className="max-w-48 truncate text-sm font-semibold text-slate-200">
                {user.full_name}
              </span>
              <span className="max-w-48 truncate text-xs font-medium text-slate-400">
                {user.email}
              </span>
            </div>
            <div aria-hidden className="mx-1 hidden h-8 w-px bg-slate-700 md:block" />

            <Link
              href="/settings"
              aria-label="Settings"
              className="flex size-11 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <GearIcon />
            </Link>
          </div>
        </div>
      </header>

      {!user.is_email_verified && (
        <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
          <p className="mx-auto max-w-5xl px-4 py-2 text-sm text-amber-900 dark:text-amber-200">
            Verify your email to mark attendance.{" "}
            <Link href="/verify-email" className="font-semibold underline">
              Verify now
            </Link>
          </p>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
