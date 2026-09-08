import { describe, expect, it } from "vitest";

import {
  ALLOWED_UPLOAD_TYPES,
  isSupportedUpload,
  MAX_UPLOAD_BYTES,
  noteFromTextSchema,
  noteFromYoutubeSchema,
  uploadContentType,
} from "../note";

function fakeFile(name: string, type: string, size = 1024): File {
  const file = new File(["x"], name, { type });
  // File size is read-only, so override it for the size checks.
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("noteFromTextSchema", () => {
  it("accepts a paragraph of material", () => {
    const result = noteFromTextSchema.safeParse({
      text: "Today we covered graph theory, adjacency matrices and traversal.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a scrap too short to generate from", () => {
    expect(noteFromTextSchema.safeParse({ text: "graphs" }).success).toBe(false);
  });

  it("trims before measuring, so whitespace cannot pad it out", () => {
    const padded = { text: `graphs${" ".repeat(200)}` };
    expect(noteFromTextSchema.safeParse(padded).success).toBe(false);
  });
});

describe("noteFromYoutubeSchema", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
  ])("accepts %s", (url) => {
    expect(noteFromYoutubeSchema.safeParse({ youtube_url: url }).success).toBe(true);
  });

  it.each(["https://vimeo.com/12345", "not a link", "https://youtube.com/watch?v=short"])(
    "rejects %s",
    (url) => {
      expect(noteFromYoutubeSchema.safeParse({ youtube_url: url }).success).toBe(false);
    },
  );
});

describe("upload validation", () => {
  it("accepts the types the backend allows", () => {
    for (const type of ALLOWED_UPLOAD_TYPES) {
      expect(isSupportedUpload(fakeFile("lecture", type))).toBe(true);
    }
  });

  it("falls back to the extension when the browser reports no type", () => {
    // Browsers report an empty type for some audio containers; rejecting those
    // would refuse perfectly valid recordings.
    expect(isSupportedUpload(fakeFile("lecture.m4a", ""))).toBe(true);
    expect(isSupportedUpload(fakeFile("handout.pdf", ""))).toBe(true);
  });

  it("rejects unrelated files", () => {
    expect(isSupportedUpload(fakeFile("virus.exe", "application/x-msdownload"))).toBe(
      false,
    );
    expect(isSupportedUpload(fakeFile("photo.png", "image/png"))).toBe(false);
  });

  it("derives a content type the backend will accept", () => {
    // The PUT must carry exactly this header or the presigned signature fails.
    expect(uploadContentType(fakeFile("a.mp3", ""))).toBe("audio/mpeg");
    expect(uploadContentType(fakeFile("a.m4a", ""))).toBe("audio/mp4");
    expect(uploadContentType(fakeFile("a.pdf", ""))).toBe("application/pdf");
    expect(uploadContentType(fakeFile("a.wav", "audio/wav"))).toBe("audio/wav");
  });

  it("mirrors the backend's size cap", () => {
    // app/schemas/note.py MAX_UPLOAD_BYTES
    expect(MAX_UPLOAD_BYTES).toBe(200 * 1024 * 1024);
  });
});
