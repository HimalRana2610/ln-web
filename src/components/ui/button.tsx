import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Disables the button and swaps the label for a spinner. */
  isLoading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900 " +
    "dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:outline-slate-400 " +
    "dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400 " +
    "dark:text-slate-300 dark:hover:bg-slate-800",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      // aria-busy tells assistive tech the control is working, which a spinner alone does not.
      aria-busy={isLoading}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {isLoading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
