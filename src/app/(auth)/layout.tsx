import type { ReactNode } from "react";

/** Centred card shell shared by sign-in and sign-up. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            LectureNote AI
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Notes, attendance and coursework in one place.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {children}
        </div>
      </div>
    </main>
  );
}
