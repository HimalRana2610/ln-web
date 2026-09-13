import { afterEach, describe, expect, it } from "vitest";

import { parseTab } from "@/lib/classroom-tabs";
import { formatCalendarDate } from "@/lib/utils";

describe("formatCalendarDate", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("names the same day in every time zone", () => {
    for (const tz of ["America/New_York", "UTC", "Asia/Kathmandu", "Pacific/Kiritimati"]) {
      process.env.TZ = tz;
      expect(formatCalendarDate("2026-09-13"), tz).toBe("Sep 13, 2026");
    }
  });

  it("is the bug it replaces: a naive parse shows the day before west of UTC", () => {
    process.env.TZ = "America/New_York";
    expect(new Date("2026-09-13").getDate()).toBe(12);
  });

  it("accepts a full timestamp by its date part", () => {
    expect(formatCalendarDate("2026-01-02T23:59:00Z")).toBe("Jan 2, 2026");
  });
});

describe("parseTab", () => {
  it("opens the members tab for teachers and students alike", () => {
    expect(parseTab("members", true)).toBe("members");
    expect(parseTab("members", false)).toBe("members");
  });
});
