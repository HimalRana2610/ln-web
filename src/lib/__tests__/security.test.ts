import { describe, expect, it } from "vitest";

import { parseTab, visibleTabs } from "@/lib/classroom-tabs";

import { alertLabel, blockFor, normaliseOtp, resendLabel } from "../security";

describe("normaliseOtp", () => {
  it("accepts the ways people type and paste a code", () => {
    for (const input of ["123456", "123 456", "123-456", " 123456\n"]) {
      expect(normaliseOtp(input)).toBe("123456");
    }
  });

  it("rejects anything that cannot be six digits", () => {
    for (const input of ["", "12345", "1234567", "12345a", "one two"]) {
      expect(normaliseOtp(input)).toBeNull();
    }
  });
});

describe("labels", () => {
  it("names every alert type and shows unknown ones as they are", () => {
    for (const type of ["multi_device", "shared_device", "wrong_device", "invalid_signature"]) {
      expect(alertLabel(type)).not.toBe(type);
    }
    expect(alertLabel("future_type")).toBe("future_type");
  });

  it("counts down the resend button", () => {
    expect(resendLabel(42)).toBe("Resend in 42s");
    expect(resendLabel(0)).toBe("Resend code");
  });
});

describe("blockFor", () => {
  const status = {
    blocks: [
      { classroom_id: "c1", classroom_name: "Networks", reason: "x", blocked_at: "2026-09-14" },
    ],
  };

  it("finds this classroom's block only", () => {
    expect(blockFor(status, "c1")?.classroom_name).toBe("Networks");
    expect(blockFor(status, "c2")).toBeNull();
    expect(blockFor(null, "c1")).toBeNull();
  });
});

describe("teacher-only tabs", () => {
  it("hides Security from students", () => {
    expect(visibleTabs(true).map((t) => t.value)).toContain("security");
    expect(visibleTabs(false).map((t) => t.value)).not.toContain("security");
  });

  it("sends a student asking for the Security tab to the stream", () => {
    expect(parseTab("security", false)).toBe("stream");
    expect(parseTab("security", true)).toBe("security");
  });
});
