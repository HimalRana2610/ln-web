"use server";

import { revalidatePath } from "next/cache";

import type { Classroom } from "@/lib/api/types";
import { authedFetch, runAction, type ActionResult } from "@/lib/api/server";
import { createClassroomSchema, joinClassroomSchema } from "@/lib/validation/classroom";

/**
 * Server Actions for the dashboard.
 *
 * These run on the server, so the access-token cookie is available and the
 * browser still never sees a token. `revalidatePath` re-renders the dashboard
 * with fresh data instead of the client refetching.
 */

export async function createClassroom(input: unknown): Promise<ActionResult<Classroom>> {
  const parsed = createClassroomSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_error",
      error: parsed.error.issues[0]?.message ?? "Check the details you entered",
    };
  }

  const { section, ...rest } = parsed.data;

  const result = await runAction(() =>
    authedFetch<Classroom>("/classrooms", {
      method: "POST",
      body: { ...rest, section: section || null },
    }),
  );

  if (result.ok) revalidatePath("/dashboard");
  return result;
}

export async function joinClassroom(input: unknown): Promise<ActionResult<Classroom>> {
  const parsed = joinClassroomSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_error",
      error: parsed.error.issues[0]?.message ?? "Check the code and try again",
    };
  }

  const result = await runAction(() =>
    authedFetch<Classroom>("/classrooms/join", { method: "POST", body: parsed.data }),
  );

  if (result.ok) revalidatePath("/dashboard");
  return result;
}

export async function leaveClassroom(classroomId: string): Promise<ActionResult<void>> {
  const result = await runAction(() =>
    authedFetch<void>(`/classrooms/${classroomId}/leave`, { method: "POST" }),
  );

  if (result.ok) revalidatePath("/dashboard");
  return result;
}

export async function deleteClassroom(classroomId: string): Promise<ActionResult<void>> {
  const result = await runAction(() =>
    authedFetch<void>(`/classrooms/${classroomId}`, { method: "DELETE" }),
  );

  if (result.ok) revalidatePath("/dashboard");
  return result;
}
