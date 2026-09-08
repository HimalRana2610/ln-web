import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AlertProps {
  tone?: "error" | "info";
  children: ReactNode;
  className?: string;
}

export function Alert({ tone = "error", children, className }: AlertProps) {
  return (
    <div
      // role="alert" makes screen readers announce it as soon as it appears.
      role="alert"
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
        className,
      )}
    >
      {children}
    </div>
  );
}
