/**
 * Attendance display rules. Pure functions, so the calendar and the labels are
 * tested without rendering anything.
 *
 * Nothing here decides who was present — the backend does. This only makes its
 * answers readable.
 */

import type { AttendanceSession, RecordStatus, SessionStatus } from "@/lib/api/types";

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  monitoring: "Monitoring",
  active: "Verification open",
  ended: "Ended",
};

export const RECORD_STATUS_LABEL: Record<RecordStatus, string> = {
  pending: "Not yet marked",
  present: "Present",
  absent: "Absent",
};

/** Backend rejection codes, phrased for a teacher reading the evidence trail. */
const REJECTION_LABEL: Record<string, string> = {
  session_not_open: "Verification not open yet",
  session_ended: "Session had ended",
  invalid_token: "Beacon not from this session",
  signal_too_weak: "Signal too weak",
  hop_limit_exceeded: "Relayed too many times",
  no_valid_evidence: "No beacon detected",
  stale_signal: "Beacon not heard recently",
  insufficient_presence: "In range under 70% of the time",
};

export function rejectionLabel(reason: string | null): string {
  if (reason === null) return "Accepted";
  return REJECTION_LABEL[reason] ?? reason;
}

export function isOpen(session: Pick<AttendanceSession, "status">): boolean {
  return session.status !== "ended";
}

export function attendancePercent(present: number, total: number): string {
  return total > 0 ? `${((present / total) * 100).toFixed(1)}%` : "0.0%";
}

export interface CalendarDay {
  /** `YYYY-MM-DD`. */
  date: string;
  day: number;
  inMonth: boolean;
  sessionCount: number;
}

/**
 * A month as whole weeks, Monday first, for a calendar grid.
 *
 * Works on calendar dates only — never `Date` instants — because a session's
 * `date` is the classroom's local day. Converting through an instant would
 * shift a morning session in Kathmandu onto the previous day for a viewer in
 * New York.
 */
export function buildMonth(
  year: number,
  /** 1–12. */
  month: number,
  sessionDates: readonly string[],
): CalendarDay[][] {
  const counts = new Map<string, number>();
  for (const date of sessionDates) counts.set(date, (counts.get(date) ?? 0) + 1);

  // Date.UTC keeps this arithmetic independent of the viewer's zone and DST.
  const first = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const start = Date.UTC(year, month - 1, 1 - mondayOffset);

  const weeks: CalendarDay[][] = [];
  for (let week = 0; week < 6; week++) {
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start + (week * 7 + i) * 86_400_000);
      const date = d.toISOString().slice(0, 10);
      days.push({
        date,
        day: d.getUTCDate(),
        inMonth: d.getUTCMonth() === month - 1,
        sessionCount: counts.get(date) ?? 0,
      });
    }
    // Drop a trailing week that belongs entirely to the next month.
    if (week > 3 && !days.some((d) => d.inMonth)) break;
    weeks.push(days);
  }
  return weeks;
}

export function shiftMonth(
  year: number,
  month: number,
  by: number,
): { year: number; month: number } {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Year and month of a `YYYY-MM-DD` string. */
export function monthOf(date: string): { year: number; month: number } {
  const [year, month] = date.split("-").map(Number);
  return { year: year!, month: month! };
}
