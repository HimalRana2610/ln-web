/**
 * Classroom post, attachment and due-date helpers.
 *
 * Mirrors `app/schemas/post.py` and the attachment allowlist in
 * `app/schemas/note.py`. The backend validates independently and is the only
 * enforcement; this saves a round trip and a wasted upload.
 */

import { z } from "zod";

import type { PostKind } from "@/lib/api/types";

export const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_DESCRIPTION_CHARS = 20_000;

/** Extension → content type. Kept in step with ALLOWED_ATTACHMENT_TYPES. */
const ATTACHMENT_TYPES_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
  odp: "application/vnd.oasis.opendocument.presentation",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  zip: "application/zip",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

const ALLOWED_ATTACHMENT_TYPES = new Set([
  ...Object.values(ATTACHMENT_TYPES_BY_EXTENSION),
  "application/x-zip-compressed",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/x-wav",
  "audio/webm",
]);

export const ATTACHMENT_ACCEPT = Object.keys(ATTACHMENT_TYPES_BY_EXTENSION)
  .map((ext) => `.${ext}`)
  .join(",");

function extension(name: string): string {
  return name.includes(".") ? (name.split(".").pop() ?? "").toLowerCase() : "";
}

/**
 * The content type to presign and PUT with, or null when the file is not
 * allowed.
 *
 * The browser's own `file.type` is preferred, but it is empty for many
 * documents on Windows and for `.md` everywhere, so the extension decides then.
 */
export function attachmentContentType(file: File): string | null {
  if (ALLOWED_ATTACHMENT_TYPES.has(file.type)) return file.type;
  return ATTACHMENT_TYPES_BY_EXTENSION[extension(file.name)] ?? null;
}

export const postSchema = z
  .object({
    kind: z.enum(["material", "announcement", "assignment"]),
    title: z
      .string()
      .trim()
      .min(1, "Give it a title")
      .max(300, "Keep the title under 300 characters"),
    description: z.string().trim().max(MAX_DESCRIPTION_CHARS, "That is too long"),
    /** A `datetime-local` value, e.g. "2026-09-20T23:59". */
    due: z.string(),
    hasFile: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "material" && !value.hasFile) {
      ctx.addIssue({ code: "custom", path: ["file"], message: "Choose the file to share" });
    }
    if (value.kind === "assignment" && value.due && Number.isNaN(Date.parse(value.due))) {
      ctx.addIssue({ code: "custom", path: ["due"], message: "That is not a valid date" });
    }
  });

export type PostFormValues = z.infer<typeof postSchema>;

/**
 * Turn a `datetime-local` value into an ISO instant with an offset.
 *
 * The input has no timezone: "23:59" means 23:59 *where the teacher is*. The
 * browser knows that zone, so the conversion happens here — the backend rejects
 * a bare local time rather than guessing, and a student in another zone then
 * sees the same instant in theirs.
 */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export const KIND_LABEL: Record<PostKind, string> = {
  material: "Material",
  announcement: "Announcement",
  assignment: "Assignment",
};

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type FileCategory =
  | "pdf"
  | "document"
  | "slides"
  | "sheet"
  | "image"
  | "audio"
  | "video"
  | "archive"
  | "text"
  | "other";

/** Which icon a file gets. */
export function fileCategory(contentType: string, filename = ""): FileCategory {
  const ext = extension(filename);
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.includes("presentation") || contentType.includes("powerpoint"))
    return "slides";
  if (contentType.includes("spreadsheet") || contentType.includes("excel") || ext === "csv") {
    return "sheet";
  }
  if (contentType.includes("word") || contentType.includes("opendocument.text"))
    return "document";
  if (contentType.includes("zip")) return "archive";
  if (contentType.startsWith("text/")) return "text";
  return "other";
}

/** Whether an assignment's due date has passed at `now`. */
export function isOverdue(dueDate: string | null, now: Date = new Date()): boolean {
  return dueDate !== null && new Date(dueDate).getTime() < now.getTime();
}
