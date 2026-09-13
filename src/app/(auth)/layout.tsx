import type { ReactNode } from "react";

import { BrandMark } from "@/components/ui/brand-mark";

/**
 * Shell shared by sign-in and sign-up: the old app's blue gradient, logo tile
 * and handwritten wordmark. The form sits on a white card rather than the old
 * translucent fields, whose placeholder-only labels failed contrast. The old
 * gradient started at blue-400, where white text is 2.5:1; blue-600 is 5.2:1.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-gradient-to-b from-blue-600 to-blue-800 px-4 pt-16 pb-8 sm:pt-24 dark:from-slate-900 dark:to-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1>
            <BrandMark size="lg" />
          </h1>
          <p className="mt-2 text-base font-medium text-white dark:text-slate-300">
            Your intelligent study companion
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 dark:ring-1 dark:ring-slate-700">
          {children}
        </div>
      </div>
    </main>
  );
}
