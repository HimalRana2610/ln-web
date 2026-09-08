"use server";

import { revalidatePath } from "next/cache";

import { authedFetch, runAction, type ActionResult } from "@/lib/api/server";
import type { Note, NoteSummary, PresignedUpload } from "@/lib/api/types";
import { noteFromTextSchema, noteFromYoutubeSchema } from "@/lib/validation/note";

/**
 * Server Actions for a classroom's notes.
 *
 * Generation is asynchronous: these return a note with `status: "pending"`, and
 * the client polls until it is ready. Waiting here would hold the request open
 * for minutes.
 */

function revalidateClassroom(classroomId: string): void {
  revalidatePath(`/classroom/${classroomId}`);
}

export async function createNoteFromText(
  classroomId: string,
  input: unknown,
): Promise<ActionResult<Note>> {
  const parsed = noteFromTextSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_error",
      error: parsed.error.issues[0]?.message ?? "Check what you entered",
    };
  }

  const result = await runAction(() =>
    authedFetch<Note>(`/classrooms/${classroomId}/notes`, {
      method: "POST",
      body: { text: parsed.data.text, date: parsed.data.date || null },
    }),
  );

  if (result.ok) revalidateClassroom(classroomId);
  return result;
}

export async function createNoteFromYoutube(
  classroomId: string,
  input: unknown,
): Promise<ActionResult<Note>> {
  const parsed = noteFromYoutubeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_error",
      error: parsed.error.issues[0]?.message ?? "Check the link",
    };
  }

  const result = await runAction(() =>
    authedFetch<Note>(`/classrooms/${classroomId}/notes`, {
      method: "POST",
      body: { youtube_url: parsed.data.youtube_url, date: parsed.data.date || null },
    }),
  );

  if (result.ok) revalidateClassroom(classroomId);
  return result;
}

/**
 * Reserve a storage slot and return a URL the browser PUTs the file to.
 *
 * The file never passes through the server — it goes straight from the browser
 * to object storage, which is what keeps a 90-minute recording from timing out
 * a serverless function.
 */
export async function presignUpload(
  filename: string,
  contentType: string,
  sizeBytes: number,
): Promise<ActionResult<PresignedUpload>> {
  return runAction(() =>
    authedFetch<PresignedUpload>("/uploads/presign", {
      method: "POST",
      body: { filename, content_type: contentType, size_bytes: sizeBytes },
    }),
  );
}

export async function createNoteFromUpload(
  classroomId: string,
  assetId: string,
  date?: string,
): Promise<ActionResult<Note>> {
  const result = await runAction(() =>
    authedFetch<Note>(`/classrooms/${classroomId}/notes`, {
      method: "POST",
      body: { asset_id: assetId, date: date || null },
    }),
  );

  if (result.ok) revalidateClassroom(classroomId);
  return result;
}

/** Poll target while a note is generating. */
export async function fetchNotes(classroomId: string): Promise<ActionResult<NoteSummary[]>> {
  return runAction(() => authedFetch<NoteSummary[]>(`/classrooms/${classroomId}/notes`));
}

export async function deleteNote(
  classroomId: string,
  noteId: string,
): Promise<ActionResult<void>> {
  const result = await runAction(() =>
    authedFetch<void>(`/notes/${noteId}`, { method: "DELETE" }),
  );

  if (result.ok) revalidateClassroom(classroomId);
  return result;
}
