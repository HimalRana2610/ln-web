"use server";

import { revalidatePath } from "next/cache";

import { authedFetch, runAction, type ActionResult } from "@/lib/api/server";
import type {
  FaceStatus,
  MySecurityStatus,
  OtpSent,
  SecurityAlert,
  StudentSecurity,
  User,
} from "@/lib/api/types";
import { normaliseOtp } from "@/lib/security";

/** Server Actions for email verification, account security and teacher tools. */

export async function sendVerificationCode(): Promise<ActionResult<OtpSent>> {
  return runAction(() => authedFetch<OtpSent>("/auth/otp/send", { method: "POST" }));
}

export async function verifyEmailCode(input: string): Promise<ActionResult<User>> {
  const code = normaliseOtp(input);
  if (code === null) {
    return { ok: false, code: "validation_error", error: "Enter the six-digit code" };
  }
  const result = await runAction(() =>
    authedFetch<User>("/auth/otp/verify", { method: "POST", body: { code } }),
  );
  // The banner in the app layout reads the user, so drop it everywhere.
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function fetchMySecurity(): Promise<ActionResult<MySecurityStatus>> {
  return runAction(() => authedFetch<MySecurityStatus>("/users/me/security"));
}

export async function deleteMyFace(): Promise<ActionResult<FaceStatus>> {
  return runAction(async () => {
    await authedFetch<void>("/face/enrollment", { method: "DELETE" });
    return authedFetch<FaceStatus>("/face/status");
  });
}

export async function fetchStudentSecurity(
  classroomId: string,
): Promise<ActionResult<StudentSecurity[]>> {
  return runAction(() =>
    authedFetch<StudentSecurity[]>(`/classrooms/${classroomId}/students/security`),
  );
}

export async function fetchAlerts(classroomId: string): Promise<ActionResult<SecurityAlert[]>> {
  return runAction(() =>
    authedFetch<SecurityAlert[]>(`/security/alerts?classroom_id=${classroomId}`),
  );
}

export async function markAlertRead(alertId: string): Promise<ActionResult<void>> {
  return runAction(() =>
    authedFetch<void>(`/security/alerts/${alertId}/read`, { method: "POST" }),
  );
}

export async function setStudentBlock(
  classroomId: string,
  studentId: string,
  blocked: boolean,
  reason: string | null,
): Promise<ActionResult<void>> {
  return runAction(() =>
    authedFetch<void>(`/classrooms/${classroomId}/students/${studentId}/block`, {
      method: "POST",
      body: { blocked, reason: reason?.trim() || null },
    }),
  );
}

export async function resetStudentEnrollment(
  classroomId: string,
  studentId: string,
): Promise<ActionResult<void>> {
  return runAction(() =>
    authedFetch<void>(`/classrooms/${classroomId}/students/${studentId}/reset-enrollment`, {
      method: "POST",
    }),
  );
}
