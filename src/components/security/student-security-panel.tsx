"use client";

import { useState, useTransition } from "react";

import {
  fetchAlerts,
  fetchStudentSecurity,
  markAlertRead,
  resetStudentEnrollment,
  setStudentBlock,
} from "@/app/(app)/security-actions";
import { LocalTime } from "@/components/post/local-time";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SecurityAlert, StudentSecurity } from "@/lib/api/types";
import { alertLabel } from "@/lib/security";
import { cn } from "@/lib/utils";

interface StudentSecurityPanelProps {
  classroomId: string;
  initialStudents: StudentSecurity[];
  initialAlerts: SecurityAlert[];
}

/**
 * Teacher tools: who is verified and bound, alerts, and block / reset.
 *
 * Nothing here is automatic. Alerts suggest; a teacher decides. That is on
 * purpose — a student wrongly blocked before an exam needs a person to look.
 */
export function StudentSecurityPanel({
  classroomId,
  initialStudents,
  initialAlerts,
}: StudentSecurityPanelProps) {
  const [students, setStudents] = useState(initialStudents);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [s, a] = await Promise.all([
      fetchStudentSecurity(classroomId),
      fetchAlerts(classroomId),
    ]);
    if (s.ok) setStudents(s.data);
    if (a.ok) setAlerts(a.data);
  }

  const unread = alerts.filter((a) => a.read_at === null);

  return (
    <div className="flex flex-col gap-8">
      {error && <Alert>{error}</Alert>}

      <section aria-labelledby="alerts-heading">
        <h2
          id="alerts-heading"
          className="mb-3 text-lg font-semibold text-slate-900 dark:text-white"
        >
          Alerts{" "}
          {unread.length > 0 && <span className="text-red-600">({unread.length} new)</span>}
        </h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nothing suspicious so far. You will see a second phone, a shared phone, or a failed
            verification here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onRead={async () => {
                  const result = await markAlertRead(alert.id);
                  if (!result.ok) return setError(result.error);
                  await refresh();
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="students-heading">
        <h2
          id="students-heading"
          className="mb-3 text-lg font-semibold text-slate-900 dark:text-white"
        >
          Students
        </h2>
        {students.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No students yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Student</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Face</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {students.map((student) => (
                  <StudentRow
                    key={student.student_id}
                    classroomId={classroomId}
                    student={student}
                    onChanged={refresh}
                    onError={setError}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        ok
          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      {children}
    </span>
  );
}

function AlertRow({ alert, onRead }: { alert: SecurityAlert; onRead: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  const critical = alert.severity === "critical";
  return (
    <li
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3",
        alert.read_at
          ? "border-slate-200 bg-white opacity-70 dark:border-slate-800 dark:bg-slate-900"
          : critical
            ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
            : "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          {alert.student_name} · {alertLabel(alert.type)}
        </p>
        <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{alert.message}</p>
        <p className="mt-1 text-xs text-slate-500">
          <LocalTime iso={alert.created_at} withTime /> · {critical ? "Critical" : "Review"}
        </p>
      </div>
      {alert.read_at === null && (
        <Button
          size="sm"
          variant="secondary"
          isLoading={pending}
          onClick={() => startTransition(onRead)}
        >
          Dismiss
        </Button>
      )}
    </li>
  );
}

function StudentRow({
  classroomId,
  student,
  onChanged,
  onError,
}: {
  classroomId: string;
  student: StudentSecurity;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  function toggleBlock() {
    let reason: string | null = null;
    if (!student.blocked) {
      reason = window.prompt(
        `Block ${student.full_name} from marking attendance in this class? Give a reason they will see (optional).`,
        "",
      );
      if (reason === null) return;
    }
    startTransition(async () => {
      const result = await setStudentBlock(
        classroomId,
        student.student_id,
        !student.blocked,
        reason,
      );
      if (!result.ok) return onError(result.error);
      await onChanged();
    });
  }

  function reset() {
    if (
      !window.confirm(
        `Reset ${student.full_name}'s enrolment? Their phone is unbound and face data deleted in every class, so they can set up a new phone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await resetStudentEnrollment(classroomId, student.student_id);
      if (!result.ok) return onError(result.error);
      await onChanged();
    });
  }

  return (
    <tr className={cn("align-middle", pending && "opacity-60")}>
      <td className="px-4 py-3">
        <p className="font-medium text-slate-900 dark:text-white">
          {student.full_name}
          {student.unread_alerts > 0 && (
            <span className="ml-2 rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
              {student.unread_alerts}
            </span>
          )}
        </p>
        <p className="text-xs text-slate-500">{student.email}</p>
        {student.blocked && (
          <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
            Blocked{student.block_reason ? `: ${student.block_reason}` : ""}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge ok={student.email_verified}>
          {student.email_verified ? "Verified" : "Unverified"}
        </Badge>
      </td>
      <td className="px-4 py-3">
        {student.device ? (
          <div>
            <Badge ok>{student.device.model ?? student.device.platform}</Badge>
            <p className="mt-1 text-xs text-slate-500">
              Seen <LocalTime iso={student.device.last_seen_at} withTime />
            </p>
          </div>
        ) : (
          <Badge ok={false}>No phone</Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge ok={student.face_enrolled}>{student.face_enrolled ? "Enrolled" : "—"}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={student.blocked ? "primary" : "ghost"}
            onClick={toggleBlock}
            disabled={pending}
          >
            {student.blocked ? "Unblock" : "Block"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            disabled={pending || (!student.device && !student.face_enrolled)}
          >
            Reset
          </Button>
        </div>
      </td>
    </tr>
  );
}
