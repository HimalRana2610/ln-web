import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SessionKeeper } from "@/components/auth/session-keeper";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getCurrentUser, getRefreshToken } from "@/lib/auth/session";

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
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      {/* Access tokens last 15 minutes; keep the cookie fresh while the tab is open. */}
      <SessionKeeper expiresInSeconds={15 * 60} />

      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="font-semibold tracking-tight text-slate-900 dark:text-white">
            LectureNote AI
          </span>

          <div className="flex items-center gap-3">
            <nav aria-label="Main" className="flex items-center gap-3 text-sm">
              <Link
                href="/dashboard"
                className="text-slate-600 hover:underline dark:text-slate-300"
              >
                Classes
              </Link>
              <Link href="/todo" className="text-slate-600 hover:underline dark:text-slate-300">
                To-do
              </Link>
            </nav>
            <Link
              href="/settings"
              className="hidden text-sm text-slate-500 hover:underline sm:inline dark:text-slate-400"
            >
              {user.full_name}
            </Link>
            <SignOutButton />
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
