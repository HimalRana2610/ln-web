import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, letting later Tailwind utilities win over earlier ones.
 *
 * Plain string concatenation leaves both `px-2` and `px-4` in the class list and
 * the winner depends on stylesheet order; `twMerge` resolves the conflict.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
