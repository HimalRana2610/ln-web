import { afterEach, describe, expect, it } from "vitest";

import { parseTab } from "@/lib/classroom-tabs";

import {
  attachmentContentType,
  fileCategory,
  formatBytes,
  isOverdue,
  localInputToIso,
  MAX_ATTACHMENT_BYTES,
  postSchema,
} from "../post";

function fakeFile(name: string, type: string): File {
  return new File(["x"], name, { type });
}

const base = { title: "Week 3", description: "", due: "", hasFile: false };

describe("postSchema", () => {
  it("accepts an announcement with only a title", () => {
    expect(postSchema.safeParse({ ...base, kind: "announcement" }).success).toBe(true);
  });

  it("requires a file for a material", () => {
    const result = postSchema.safeParse({ ...base, kind: "material" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Choose the file to share");

    expect(postSchema.safeParse({ ...base, kind: "material", hasFile: true }).success).toBe(
      true,
    );
  });

  it("rejects a blank title after trimming", () => {
    expect(postSchema.safeParse({ ...base, kind: "announcement", title: "   " }).success).toBe(
      false,
    );
  });

  it("allows an assignment without a deadline", () => {
    expect(postSchema.safeParse({ ...base, kind: "assignment" }).success).toBe(true);
  });
});

describe("localInputToIso", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("reads a datetime-local value in the browser's own zone", () => {
    // 23:59 in Kathmandu (UTC+05:45) is 18:14 UTC. Converting on the server,
    // whose zone is UTC on Vercel, would silently store 23:59 UTC instead.
    process.env.TZ = "Asia/Kathmandu";
    expect(localInputToIso("2026-09-20T23:59")).toBe("2026-09-20T18:14:00.000Z");

    process.env.TZ = "America/New_York";
    expect(localInputToIso("2026-09-20T23:59")).toBe("2026-09-21T03:59:00.000Z");
  });

  it("returns null for an empty or invalid value", () => {
    expect(localInputToIso("")).toBeNull();
    expect(localInputToIso("not a date")).toBeNull();
  });
});

describe("attachmentContentType", () => {
  it("trusts a browser-reported type the backend allows", () => {
    expect(attachmentContentType(fakeFile("a.pdf", "application/pdf"))).toBe("application/pdf");
  });

  it("falls back to the extension when the browser reports nothing", () => {
    // Windows reports an empty type for .docx without Office installed, and
    // every browser does for .md.
    expect(attachmentContentType(fakeFile("Essay.DOCX", ""))).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(attachmentContentType(fakeFile("README.md", ""))).toBe("text/markdown");
  });

  it("refuses what the backend refuses", () => {
    expect(attachmentContentType(fakeFile("setup.exe", "application/x-msdownload"))).toBeNull();
    expect(attachmentContentType(fakeFile("no-extension", ""))).toBeNull();
  });

  it("mirrors the backend's size cap", () => {
    // app/schemas/note.py MAX_ATTACHMENT_BYTES
    expect(MAX_ATTACHMENT_BYTES).toBe(100 * 1024 * 1024);
  });
});

describe("display helpers", () => {
  it("categorises files for their icon", () => {
    expect(fileCategory("application/pdf")).toBe("pdf");
    expect(
      fileCategory("application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    ).toBe("slides");
    expect(fileCategory("text/csv", "marks.csv")).toBe("sheet");
    expect(fileCategory("image/png")).toBe("image");
    expect(fileCategory("application/octet-stream")).toBe("other");
  });

  it("formats sizes", () => {
    expect(formatBytes(null)).toBe("");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("compares due dates as instants, whatever their offset", () => {
    const now = new Date("2026-09-20T18:20:00Z");
    // 18:14Z. As strings "…23:59…" sorts after "…18:20…" and would look future.
    expect(isOverdue("2026-09-20T23:59:00+05:45", now)).toBe(true);
    // 18:45Z.
    expect(isOverdue("2026-09-21T00:30:00+05:45", now)).toBe(false);
    expect(isOverdue(null, now)).toBe(false);
  });
});

describe("parseTab", () => {
  it("accepts known tabs and falls back to the stream", () => {
    expect(parseTab("assignments")).toBe("assignments");
    expect(parseTab(["materials", "notes"])).toBe("materials");
    expect(parseTab(undefined)).toBe("stream");
    expect(parseTab("../../admin")).toBe("stream");
  });
});
