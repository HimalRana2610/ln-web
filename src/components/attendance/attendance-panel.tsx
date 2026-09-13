"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  correctRecord,
  endSession,
  fetchRecords,
  fetchSessions,
  fetchVerifications,
} from "@/app/(app)/classroom/[classroomId]/attendance-actions";
import { LocalTime } from "@/components/post/local-time";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type {
  AttendanceRecord,
  AttendanceSession,
  RecordStatus,
  SessionStatus,
  VerificationAttempt,
} from "@/lib/api/types";
import {
  attendancePercent,
  buildMonth,
  isOpen,
  monthOf,
  RECORD_STATUS_LABEL,
  rejectionLabel,
  SESSION_STATUS_LABEL,
  shiftMonth,
} from "@/lib/attendance";
import { cn } from "@/lib/utils";

/** How often an open session refreshes, so students appear as they are marked. */
const POLL_INTERVAL_MS = 5000;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface AttendancePanelProps {
  classroomId: string;
  initialSessions: AttendanceSession[];
  canManage: boolean;
}

export function AttendancePanel({
  classroomId,
  initialSessions,
  canManage,
}: AttendancePanelProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [syncedFrom, setSyncedFrom] = useState(initialSessions);
  const [selectedId, setSelectedId] = useState<string | null>(initialSessions[0]?.id ?? null);
  const [dayFilter, setDayFilter] = useState<string | null>(null);

  if (syncedFrom !== initialSessions) {
    setSyncedFrom(initialSessions);
    setSessions(initialSessions);
  }

  const anyOpen = sessions.some(isOpen);

  useEffect(() => {
    if (!anyOpen) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const result = await fetchSessions(classroomId);
      if (!cancelled && result.ok) setSessions(result.data);
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [anyOpen, classroomId]);

  const visible = dayFilter ? sessions.filter((s) => s.date === dayFilter) : sessions;
  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Attendance</h2>
        {canManage && sessions.length > 0 && (
          // A plain link: the route handler streams the file with the backend's
          // filename, and the browser handles the download natively.
          <a
            href={`/api/attendance/${classroomId}/export`}
            className="inline-flex h-9 items-center rounded-lg bg-slate-100 px-3 text-sm font-medium text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Download spreadsheet
          </a>
        )}
      </div>

      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        {canManage
          ? "Attendance is taken on the mobile app, which uses Bluetooth to confirm who is in the room. Results appear here as students are marked."
          : "Mark your attendance from the mobile app while you are in the room."}
      </p>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No attendance has been taken in this class yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          {/* minmax(0, 1fr), not an auto track: otherwise the register table widens
              the page instead of scrolling inside its own container on a phone. */}
          <div className="flex flex-col gap-4">
            <SessionCalendar
              sessions={sessions}
              selectedDay={dayFilter}
              onSelectDay={(day) => {
                setDayFilter(day);
                const first = day ? sessions.find((s) => s.date === day) : sessions[0];
                if (first) setSelectedId(first.id);
              }}
            />

            <ul className="flex flex-col gap-2" aria-label="Attendance sessions">
              {visible.map((session) => (
                <li key={session.id}>
                  <SessionRow
                    session={session}
                    canManage={canManage}
                    selected={session.id === selectedId}
                    onSelect={() => setSelectedId(session.id)}
                  />
                </li>
              ))}
            </ul>
          </div>

          {selected && (
            <SessionDetail
              // Remount per session so records and attempts never show the
              // previous session's rows while the new ones load.
              key={selected.id}
              session={selected}
              canManage={canManage}
              onSessionChanged={(updated) =>
                setSessions((current) =>
                  current.map((s) => (s.id === updated.id ? updated : s)),
                )
              }
            />
          )}
        </div>
      )}
    </>
  );
}

// -- calendar -------------------------------------------------------------

function SessionCalendar({
  sessions,
  selectedDay,
  onSelectDay,
}: {
  sessions: AttendanceSession[];
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}) {
  // Opens on the month of the most recent session: a date the server sent, so
  // server and browser render the same grid.
  const [{ year, month }, setMonth] = useState(() => monthOf(sessions[0]!.date));
  const dates = useMemo(() => sessions.map((s) => s.date), [sessions]);
  const weeks = buildMonth(year, month, dates);
  const title = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth(shiftMonth(year, month, -1))}
          className="flex size-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          ‹
        </button>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonth(shiftMonth(year, month, 1))}
          className="flex size-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1 text-slate-500 dark:text-slate-400">
            {d}
          </span>
        ))}
        {weeks.flat().map((day) => {
          const hasSession = day.sessionCount > 0;
          const isSelected = day.date === selectedDay;
          return (
            <button
              key={day.date}
              type="button"
              disabled={!hasSession}
              aria-pressed={isSelected}
              aria-label={
                hasSession
                  ? `${day.date}, ${day.sessionCount} session${day.sessionCount === 1 ? "" : "s"}`
                  : day.date
              }
              onClick={() => onSelectDay(isSelected ? null : day.date)}
              className={cn(
                "relative aspect-square rounded-md text-xs",
                day.inMonth
                  ? "text-slate-700 dark:text-slate-200"
                  : "text-slate-300 dark:text-slate-600",
                hasSession && "font-semibold hover:bg-blue-50 dark:hover:bg-blue-950",
                isSelected && "bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-600",
              )}
            >
              {day.day}
              {hasSession && !isSelected && (
                <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <button
          type="button"
          onClick={() => onSelectDay(null)}
          className="mt-2 w-full text-xs text-slate-500 hover:underline dark:text-slate-400"
        >
          Show all sessions
        </button>
      )}
    </div>
  );
}

// -- session list ------------------------------------------------------------

function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "active" &&
          "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
        status === "monitoring" &&
          "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        status === "ended" &&
          "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
      )}
    >
      {SESSION_STATUS_LABEL[status]}
    </span>
  );
}

function RecordBadge({ status }: { status: RecordStatus }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "present" &&
          "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
        status === "absent" && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
        status === "pending" &&
          "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
      )}
    >
      {RECORD_STATUS_LABEL[status]}
    </span>
  );
}

function SessionRow({
  session,
  canManage,
  selected,
  onSelect,
}: {
  session: AttendanceSession;
  canManage: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "w-full rounded-xl border bg-white p-3 text-left transition dark:bg-slate-800",
        selected
          ? "border-blue-500 ring-1 ring-blue-500"
          : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-700",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          <LocalTime iso={session.started_at} withTime />
        </p>
        <StatusBadge status={session.status} />
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {canManage || session.my_status === null ? (
          <>
            {session.present_count} of {session.record_count} present ·{" "}
            {session.started_by_name}
          </>
        ) : (
          <>You: {RECORD_STATUS_LABEL[session.my_status]}</>
        )}
      </p>
    </button>
  );
}

// -- session detail ----------------------------------------------------------

function SessionDetail({
  session,
  canManage,
  onSessionChanged,
}: {
  session: AttendanceSession;
  canManage: boolean;
  onSessionChanged: (session: AttendanceSession) => void;
}) {
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAttempts, setShowAttempts] = useState(false);
  const [ending, startEnding] = useTransition();
  const open = isOpen(session);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await fetchRecords(session.id);
      if (cancelled) return;
      if (result.ok) setRecords(result.data);
      else setError(result.error);
    }
    void load();
    // Keep the register live while students are still being marked.
    const timer = open ? setInterval(load, POLL_INTERVAL_MS) : undefined;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [session.id, open]);

  function end() {
    if (
      !window.confirm(
        "End this session? Everyone not yet marked will be recorded absent. Students can no longer mark themselves.",
      )
    ) {
      return;
    }
    startEnding(async () => {
      const result = await endSession(session.id);
      if (!result.ok) return setError(result.error);
      onSessionChanged(result.data);
      const refreshed = await fetchRecords(session.id);
      if (refreshed.ok) setRecords(refreshed.data);
    });
  }

  const present =
    records?.filter((r) => r.status === "present").length ?? session.present_count;
  const total = records?.length ?? session.record_count;

  return (
    <section
      aria-label="Session detail"
      className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              <LocalTime iso={session.started_at} withTime />
            </h3>
            <StatusBadge status={session.status} />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Started by {session.started_by_name}
            {session.ended_at && (
              <>
                {" "}
                · ended <LocalTime iso={session.ended_at} withTime />
              </>
            )}
          </p>
        </div>
        {canManage && open && (
          <Button size="sm" variant="secondary" onClick={end} isLoading={ending}>
            End session
          </Button>
        )}
      </div>

      {canManage && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Present" value={`${present} / ${total}`} />
          <Stat label="Rate" value={attendancePercent(present, total)} />
          <Stat label="Signal threshold" value={`${session.rssi_threshold} dBm`} />
          <Stat label="Max relays" value={String(session.hop_depth)} />
        </dl>
      )}

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-5">
        {records === null && !error && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        )}
        {records?.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No students in this session.
          </p>
        )}
        {records && records.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase dark:text-slate-400">
                <tr>
                  <th className="py-2 pr-4 font-medium">Student</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Marked</th>
                  {canManage && <th className="py-2 font-medium">Correct</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {records.map((record) => (
                  <RecordRow
                    key={record.id}
                    record={record}
                    canManage={canManage}
                    onChanged={(updated) =>
                      setRecords(
                        (current) =>
                          current?.map((r) => (r.id === updated.id ? updated : r)) ?? null,
                      )
                    }
                    onError={setError}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canManage && (
        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setShowAttempts((v) => !v)}
            aria-expanded={showAttempts}
            className="text-sm font-medium text-slate-700 hover:underline dark:text-slate-300"
          >
            {showAttempts ? "Hide" : "Show"} verification attempts
          </button>
          {showAttempts && <AttemptList sessionId={session.id} />}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/60">
      <dt className="text-[11px] text-slate-500 uppercase dark:text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-900 tabular-nums dark:text-white">{value}</dd>
    </div>
  );
}

function RecordRow({
  record,
  canManage,
  onChanged,
  onError,
}: {
  record: AttendanceRecord;
  canManage: boolean;
  onChanged: (record: AttendanceRecord) => void;
  onError: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function set(status: "present" | "absent") {
    startTransition(async () => {
      const result = await correctRecord(record.id, status);
      if (result.ok) onChanged(result.data);
      else onError(result.error);
    });
  }

  return (
    <tr className={cn("align-middle", isPending && "opacity-60")}>
      <td className="py-3 pr-4">
        <p className="font-medium text-slate-900 dark:text-white">{record.student_name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{record.student_email}</p>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-1.5">
          <RecordBadge status={record.status} />
          {record.corrected && (
            <span
              className="rounded bg-blue-100 px-1 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              title="Set by a teacher rather than verified over Bluetooth"
            >
              MANUAL
            </span>
          )}
        </div>
      </td>
      <td className="py-3 pr-4 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
        {record.marked_at ? <LocalTime iso={record.marked_at} withTime /> : "—"}
      </td>
      {canManage && (
        <td className="py-3">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={record.status === "present" ? "primary" : "ghost"}
              disabled={isPending || record.status === "present"}
              onClick={() => set("present")}
            >
              Present
            </Button>
            <Button
              size="sm"
              variant={record.status === "absent" ? "primary" : "ghost"}
              disabled={isPending || record.status === "absent"}
              onClick={() => set("absent")}
            >
              Absent
            </Button>
          </div>
        </td>
      )}
    </tr>
  );
}

function AttemptList({ sessionId }: { sessionId: string }) {
  const [attempts, setAttempts] = useState<VerificationAttempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchVerifications(sessionId).then((result) => {
      if (cancelled) return;
      if (result.ok) setAttempts(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (error) return <Alert>{error}</Alert>;
  if (attempts === null)
    return <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading…</p>;
  if (attempts.length === 0) {
    return <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No attempts yet.</p>;
  }

  return (
    <ul className="mt-3 flex flex-col divide-y divide-slate-200 text-sm dark:divide-slate-700">
      {attempts.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{a.student_name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <LocalTime iso={a.created_at} withTime /> · in range {a.valid_windows}/
              {a.elapsed_windows} windows
              {a.avg_rssi !== null && ` · ${a.avg_rssi} dBm`}
              {a.hop_count !== null &&
                ` · ${a.hop_count === 0 ? "direct" : `${a.hop_count} hop`}`}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              a.accepted
                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
            )}
          >
            {rejectionLabel(a.rejection_reason)}
          </span>
        </li>
      ))}
    </ul>
  );
}
