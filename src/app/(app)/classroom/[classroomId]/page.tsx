import type { Metadata } from "next";
import Link from "next/link";

import { AttendancePanel } from "@/components/attendance/attendance-panel";
import { ClassroomTabs } from "@/components/classroom/classroom-tabs";
import { NoteList } from "@/components/note/note-list";
import { AssignmentList } from "@/components/post/assignment-list";
import { PostFeed } from "@/components/post/post-feed";
import { QuizPanel } from "@/components/quiz/quiz-panel";
import { StudentSecurityPanel } from "@/components/security/student-security-panel";
import { fetchOr404 } from "@/lib/api/fetch-or-404";
import { authedFetch } from "@/lib/api/server";
import type {
  AttendanceSession,
  Classroom,
  MySecurityStatus,
  NoteSummary,
  Post,
  QuizState,
  SecurityAlert,
  StudentSecurity,
} from "@/lib/api/types";
import { parseTab } from "@/lib/classroom-tabs";
import { blockFor } from "@/lib/security";

export const metadata: Metadata = { title: "Classroom" };

const POST_KIND = {
  stream: "announcement",
  materials: "material",
  assignments: "assignment",
} as const satisfies Record<string, Post["kind"]>;

/**
 * Props of a Client Component are serialised into the page, so anything left
 * on them reaches the browser. Only phones advertise the beacon; a secret in
 * page source is one more place it could be copied from.
 */
function withoutBeaconSecret(sessions: AttendanceSession[]): AttendanceSession[] {
  return sessions.map((session) => ({ ...session, beacon_secret: null }));
}

export default async function ClassroomPage({
  params,
  searchParams,
}: {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { classroomId } = await params;
  const requestedTab = (await searchParams).tab;

  // The classroom comes first: it is what turns a non-member's visit into a
  // 404, and the viewer's role decides which tabs exist.
  const classroom = await fetchOr404(() =>
    authedFetch<Classroom>(`/classrooms/${classroomId}`),
  );
  const canManage = classroom.my_role !== "student";
  const tab = parseTab(requestedTab, canManage);

  // Only the visible section is fetched.
  const [sectionData, security] = await fetchOr404(() =>
    Promise.all([
      tab === "notes"
        ? authedFetch<NoteSummary[]>(`/classrooms/${classroomId}/notes`)
        : tab === "attendance"
          ? authedFetch<AttendanceSession[]>(`/classrooms/${classroomId}/attendance/sessions`)
          : tab === "quiz"
            ? authedFetch<QuizState>(`/classrooms/${classroomId}/quiz`)
            : tab === "security"
              ? Promise.all([
                  authedFetch<StudentSecurity[]>(
                    `/classrooms/${classroomId}/students/security`,
                  ),
                  authedFetch<SecurityAlert[]>(`/security/alerts?classroom_id=${classroomId}`),
                ])
              : authedFetch<Post[]>(`/classrooms/${classroomId}/posts?kind=${POST_KIND[tab]}`),
      canManage ? null : authedFetch<MySecurityStatus>("/users/me/security"),
    ]),
  );

  const block = blockFor(security, classroomId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          ← All classes
        </Link>

        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          {classroom.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {classroom.section ? `${classroom.section} · ` : ""}
          {classroom.member_count} {classroom.member_count === 1 ? "member" : "members"} · Code{" "}
          <code className="font-mono">{classroom.code}</code>
        </p>
      </div>

      {block && (
        // Ported from the old BlockedStudent page, as a banner: the rest of
        // the class — notes, materials — stays usable; only attendance is off.
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
        >
          <p className="font-semibold">
            You are blocked from marking attendance in this class.
          </p>
          {block.reason && <p className="mt-1">Reason: {block.reason}</p>}
          <p className="mt-1">
            If this is a mistake, speak to your teacher — only they can clear it.
          </p>
        </div>
      )}

      <ClassroomTabs active={tab} canManage={canManage}>
        <section>
          {tab === "notes" && (
            <NoteList
              classroomId={classroomId}
              initialNotes={sectionData as NoteSummary[]}
              canManage={canManage}
            />
          )}
          {tab === "stream" && (
            <PostFeed
              key="announcement"
              kind="announcement"
              classroomId={classroomId}
              initialPosts={sectionData as Post[]}
              canManage={canManage}
            />
          )}
          {tab === "materials" && (
            <PostFeed
              key="material"
              kind="material"
              classroomId={classroomId}
              initialPosts={sectionData as Post[]}
              canManage={canManage}
            />
          )}
          {tab === "assignments" && (
            <AssignmentList
              classroomId={classroomId}
              initialPosts={sectionData as Post[]}
              canManage={canManage}
            />
          )}
          {tab === "attendance" && (
            <AttendancePanel
              classroomId={classroomId}
              initialSessions={withoutBeaconSecret(sectionData as AttendanceSession[])}
              canManage={canManage}
            />
          )}
          {tab === "quiz" && (
            <QuizPanel
              classroomId={classroomId}
              initialState={sectionData as QuizState}
              canManage={canManage}
            />
          )}
          {tab === "security" && (
            <StudentSecurityPanel
              classroomId={classroomId}
              initialStudents={(sectionData as [StudentSecurity[], SecurityAlert[]])[0]}
              initialAlerts={(sectionData as [StudentSecurity[], SecurityAlert[]])[1]}
            />
          )}
        </section>
      </ClassroomTabs>
    </div>
  );
}
