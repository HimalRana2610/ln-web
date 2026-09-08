/**
 * Note form schemas.
 *
 * Mirrors `app/schemas/note.py`. Client-side validation saves a round trip; the
 * backend validates independently and is the only enforcement.
 */

import { z } from "zod";

export const MAX_SOURCE_TEXT_CHARS = 200_000;
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB, ~3 hours of audio

/** Kept in step with ALLOWED_UPLOAD_TYPES in `app/schemas/note.py`. */
export const ALLOWED_UPLOAD_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "application/pdf",
] as const;

/** What to put in a file input's `accept`. */
export const UPLOAD_ACCEPT = "audio/*,application/pdf";

const youtubePattern =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export const noteFromTextSchema = z.object({
  date: z.string().optional(),
  text: z
    .string()
    .trim()
    .min(20, "Paste at least a paragraph — there is not enough here to work from")
    .max(MAX_SOURCE_TEXT_CHARS, "That is too long"),
});

export const noteFromYoutubeSchema = z.object({
  date: z.string().optional(),
  youtube_url: z
    .string()
    .trim()
    .min(1, "Paste a YouTube link")
    .refine((value) => youtubePattern.test(value), "That is not a YouTube video link"),
});

export function isSupportedUpload(file: File): boolean {
  // Browsers sometimes report an empty type for uncommon audio containers, so
  // fall back to the extension rather than rejecting a valid recording.
  if ((ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) return true;
  return /\.(mp3|m4a|aac|wav|webm|ogg|flac|pdf)$/i.test(file.name);
}

export function uploadContentType(file: File): string {
  if ((ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) return file.type;
  if (/\.pdf$/i.test(file.name)) return "application/pdf";
  if (/\.mp3$/i.test(file.name)) return "audio/mpeg";
  if (/\.(m4a|mp4)$/i.test(file.name)) return "audio/mp4";
  if (/\.wav$/i.test(file.name)) return "audio/wav";
  if (/\.ogg$/i.test(file.name)) return "audio/ogg";
  if (/\.flac$/i.test(file.name)) return "audio/flac";
  if (/\.webm$/i.test(file.name)) return "audio/webm";
  return "audio/mpeg";
}

export type NoteFromTextValues = z.infer<typeof noteFromTextSchema>;
export type NoteFromYoutubeValues = z.infer<typeof noteFromYoutubeSchema>;
