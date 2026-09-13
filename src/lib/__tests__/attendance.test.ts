import { describe, expect, it } from "vitest";

import { CLASSROOM_TABS, parseTab } from "@/lib/classroom-tabs";

import {
  attendancePercent,
  buildMonth,
  isOpen,
  monthOf,
  rejectionLabel,
  shiftMonth,
} from "../attendance";

describe("buildMonth", () => {
  it("starts weeks on Monday and pads with neighbouring months", () => {
    // 1 September 2026 is a Tuesday.
    const weeks = buildMonth(2026, 9, []);
    expect(weeks[0]![0]).toMatchObject({ date: "2026-08-31", day: 31, inMonth: false });
    expect(weeks[0]![1]).toMatchObject({ date: "2026-09-01", day: 1, inMonth: true });
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it("covers every day of the month exactly once", () => {
    for (const [year, month, days] of [
      [2026, 2, 28],
      [2028, 2, 29],
      [2026, 9, 30],
      [2026, 12, 31],
    ] as const) {
      const inMonth = buildMonth(year, month, [])
        .flat()
        .filter((d) => d.inMonth);
      expect(inMonth).toHaveLength(days);
      expect(new Set(inMonth.map((d) => d.date)).size).toBe(days);
    }
  });

  it("drops a trailing week that is entirely next month", () => {
    // February 2027 starts on a Monday and has exactly four weeks.
    expect(buildMonth(2027, 2, [])).toHaveLength(4);
  });

  it("counts sessions per calendar day", () => {
    const days = buildMonth(2026, 9, ["2026-09-14", "2026-09-14", "2026-09-15"]).flat();
    expect(days.find((d) => d.date === "2026-09-14")?.sessionCount).toBe(2);
    expect(days.find((d) => d.date === "2026-09-15")?.sessionCount).toBe(1);
    expect(days.find((d) => d.date === "2026-09-16")?.sessionCount).toBe(0);
  });

  it("does not depend on the viewer's timezone", () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = "America/New_York";
      const newYork = JSON.stringify(buildMonth(2026, 3, ["2026-03-08"]));
      process.env.TZ = "Asia/Kathmandu";
      const kathmandu = JSON.stringify(buildMonth(2026, 3, ["2026-03-08"]));
      expect(newYork).toBe(kathmandu);
    } finally {
      process.env.TZ = original;
    }
  });
});

describe("month helpers", () => {
  it("shifts across year boundaries", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 9, 0)).toEqual({ year: 2026, month: 9 });
  });

  it("reads a date string without going through an instant", () => {
    expect(monthOf("2026-09-01")).toEqual({ year: 2026, month: 9 });
  });
});

describe("labels", () => {
  it("names every backend rejection reason", () => {
    for (const reason of [
      "session_not_open",
      "session_ended",
      "invalid_token",
      "signal_too_weak",
      "hop_limit_exceeded",
      "no_valid_evidence",
      "stale_signal",
      "insufficient_presence",
    ]) {
      expect(rejectionLabel(reason)).not.toBe(reason);
    }
    expect(rejectionLabel(null)).toBe("Accepted");
    // An unknown future code is shown rather than hidden.
    expect(rejectionLabel("new_rule")).toBe("new_rule");
  });

  it("formats percentages like the old export", () => {
    expect(attendancePercent(1, 2)).toBe("50.0%");
    expect(attendancePercent(2, 3)).toBe("66.7%");
    expect(attendancePercent(0, 0)).toBe("0.0%");
  });

  it("treats monitoring and active as open", () => {
    expect(isOpen({ status: "monitoring" })).toBe(true);
    expect(isOpen({ status: "active" })).toBe(true);
    expect(isOpen({ status: "ended" })).toBe(false);
  });
});

describe("attendance tab", () => {
  it("is a classroom section", () => {
    expect(CLASSROOM_TABS.map((t) => t.value)).toContain("attendance");
    expect(parseTab("attendance")).toBe("attendance");
  });
});
