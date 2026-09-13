"use server";

import { revalidatePath } from "next/cache";

import { authedFetch, runAction, type ActionResult } from "@/lib/api/server";
import type { DownloadLink, Post, Submission } from "@/lib/api/types";
import { postSchema } from "@/lib/validation/post";

/**
 * Server Actions for materials, announcements, assignments and submissions.
 *
 * Files are never sent here. The browser presigns (`presignUpload` with
 * `purpose: "attachment"`), PUTs straight to storage, and passes only the
 * resulting asset id — so a 100 MB slide deck cannot time out a function.
 */

function revalidateClassroom(classroomId: string): void {
  revalidatePath(`/classroom/${classroomId}`);
}

export interface CreatePostInput {
  kind: Post["kind"];
  title: string;
  description: string;
  /** `datetime-local` value, already in the teacher's zone. */
  due: string;
  /** ISO instant computed in the browser, which knows the teacher's zone. */
  dueIso: string | null;
  assetId: string | null;
}

export async function createPost(
  classroomId: string,
  input: CreatePostInput,
): Promise<ActionResult<Post>> {
  const parsed = postSchema.safeParse({
    kind: input.kind,
    title: input.title,
    description: input.description,
    due: input.due,
    hasFile: input.assetId !== null,
  });
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_error",
      error: parsed.error.issues[0]?.message ?? "Check what you entered",
    };
  }

  // The ISO value is computed client-side on purpose: this action runs on the
  // server, whose timezone is not the teacher's. Converting `due` here would
  // shift every deadline by the server's offset.
  const dueDate = parsed.data.kind === "assignment" ? input.dueIso : null;
  if (parsed.data.kind === "assignment" && parsed.data.due && dueDate === null) {
    return { ok: false, code: "validation_error", error: "That is not a valid date" };
  }

  const result = await runAction(() =>
    authedFetch<Post>(`/classrooms/${classroomId}/posts`, {
      method: "POST",
      body: {
        kind: parsed.data.kind,
        title: parsed.data.title,
        description: parsed.data.description || null,
        due_date: dueDate,
        asset_id: input.assetId,
      },
    }),
  );

  if (result.ok) revalidateClassroom(classroomId);
  return result;
}

export async function deletePost(
  classroomId: string,
  postId: string,
): Promise<ActionResult<void>> {
  const result = await runAction(() =>
    authedFetch<void>(`/posts/${postId}`, { method: "DELETE" }),
  );
  if (result.ok) revalidateClassroom(classroomId);
  return result;
}

export async function submitWork(
  classroomId: string,
  postId: string,
  assetId: string,
): Promise<ActionResult<Submission>> {
  const result = await runAction(() =>
    authedFetch<Submission>(`/posts/${postId}/submissions`, {
      method: "POST",
      body: { asset_id: assetId },
    }),
  );
  if (result.ok) revalidateClassroom(classroomId);
  return result;
}

export async function fetchSubmissions(postId: string): Promise<ActionResult<Submission[]>> {
  return runAction(() => authedFetch<Submission[]>(`/posts/${postId}/submissions`));
}

export async function fetchMySubmission(postId: string): Promise<ActionResult<Submission>> {
  return runAction(() => authedFetch<Submission>(`/posts/${postId}/submissions/me`));
}

/** A fresh short-lived URL. Requested per click; never cached or stored. */
export async function getDownloadLink(assetId: string): Promise<ActionResult<DownloadLink>> {
  return runAction(() => authedFetch<DownloadLink>(`/assets/${assetId}/download`));
}
