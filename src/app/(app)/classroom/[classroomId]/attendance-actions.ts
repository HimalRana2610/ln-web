"use server";

import { authedFetch, runAction, type ActionResult } from "@/lib/api/server";
import type {
  AttendanceRecord,
  AttendanceSession,
  RecordStatus,
  VerificationAttempt,
} from "@/lib/api/types";

/**
 * Server Actions for the attendance tab.
 *
 * There is deliberately no action to mark anyone present by evidence: a browser
 * cannot use Bluetooth LE, so attendance is *taken* on phones. The web app
 * reads the results, corrects them by hand, and can end a session a teacher
 * forgot to close on their phone.
 */

/** A Server Action's return value is sent to the browser; the secret stays behind. */
function redact(session: AttendanceSession): AttendanceSession {
  return { ...session, beacon_secret: null };
}

export async function fetchSessions(
  classroomId: string,
): Promise<ActionResult<AttendanceSession[]>> {
  return runAction(async () =>
    (
      await authedFetch<AttendanceSession[]>(`/classrooms/${classroomId}/attendance/sessions`)
    ).map(redact),
  );
}

export async function fetchRecords(
  sessionId: string,
): Promise<ActionResult<AttendanceRecord[]>> {
  return runAction(() =>
    authedFetch<AttendanceRecord[]>(`/attendance/sessions/${sessionId}/records`),
  );
}

export async function fetchVerifications(
  sessionId: string,
): Promise<ActionResult<VerificationAttempt[]>> {
  return runAction(() =>
    authedFetch<VerificationAttempt[]>(`/attendance/sessions/${sessionId}/verifications`),
  );
}

export async function correctRecord(
  recordId: string,
  status: Exclude<RecordStatus, "pending">,
): Promise<ActionResult<AttendanceRecord>> {
  return runAction(() =>
    authedFetch<AttendanceRecord>(`/attendance/records/${recordId}`, {
      method: "PATCH",
      body: { status },
    }),
  );
}

export async function endSession(sessionId: string): Promise<ActionResult<AttendanceSession>> {
  return runAction(async () =>
    redact(
      await authedFetch<AttendanceSession>(`/attendance/sessions/${sessionId}`, {
        method: "PATCH",
        body: { status: "ended" },
      }),
    ),
  );
}
