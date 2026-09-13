"use server";

import { revalidatePath } from "next/cache";

import { authedFetch, runAction, type ActionResult } from "@/lib/api/server";

/** Remove someone from a classroom. The backend decides who may. */
export async function removeMember(
  classroomId: string,
  userId: string,
): Promise<ActionResult<void>> {
  const result = await runAction(() =>
    authedFetch<void>(`/classrooms/${classroomId}/members/${userId}`, { method: "DELETE" }),
  );

  if (result.ok) revalidatePath(`/classroom/${classroomId}`);
  return result;
}
