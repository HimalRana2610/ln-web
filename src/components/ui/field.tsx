"use client";

import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

/**
 * Labelled text input with inline validation messaging.
 *
 * The error is wired up with `aria-describedby` and `aria-invalid` so screen
 * readers announce it, rather than it being red text a sighted user alone sees.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>

      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error && errorId, hint && hintId) || undefined}
        className={cn(
          "h-11 rounded-lg border px-3 text-sm outline-none transition-colors",
          "bg-white text-slate-900 placeholder:text-slate-400",
          "dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900"
            : "border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:focus:border-slate-400 dark:focus:ring-slate-800",
          className,
        )}
        {...props}
      />

      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});
