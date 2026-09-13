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

const CALENDAR_DATE = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/**
 * Format a date-only value such as a lecture date (`2026-09-13`).
 *
 * It names a day, not an instant, so no time zone applies. `new Date(value)`
 * reads it as UTC midnight and the viewer's locale formatting then shows the
 * day before anywhere west of UTC; and a default locale differs between the
 * server and the browser, which breaks hydration. Fixed locale, fixed zone.
 */
export function formatCalendarDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return CALENDAR_DATE.format(new Date(Date.UTC(year, month - 1, day)));
}
