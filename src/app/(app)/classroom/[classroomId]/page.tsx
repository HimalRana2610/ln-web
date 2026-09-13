import type { Metadata } from "next";
import Link from "next/link";

import { AttendancePanel } from "@/components/attendance/attendance-panel";
import { ClassroomTabs } from "@/components/classroom/classroom-tabs";
import { MembersList } from "@/components/classroom/members-list";
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
  ClassroomMember,
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
            : tab === "members"
              ? authedFetch<ClassroomMember[]>(`/classrooms/${classroomId}/members`)
              : tab === "security"
                ? Promise.all([
                    authedFetch<StudentSecurity[]>(
                      `/classrooms/${classroomId}/students/security`,
                    ),
                    authedFetch<SecurityAlert[]>(
                      `/security/alerts?classroom_id=${classroomId}`,
                    ),
                  ])
                : authedFetch<Post[]>(
                    `/classrooms/${classroomId}/posts?kind=${POST_KIND[tab]}`,
                  ),
      canManage ? null : authedFetch<MySecurityStatus>("/users/me/security"),
    ]),
  );

  const block = blockFor(security, classroomId);

  return (
    <div className="flex flex-col gap-8">
      {/* The old classroom header: dark slate, back arrow, title, section and a code chip. */}
      <div className="flex items-start gap-3 rounded-2xl bg-slate-900 px-4 py-4 text-white shadow-lg sm:px-6 dark:ring-1 dark:ring-slate-700">
        <Link
          href="/dashboard"
          aria-label="All classes"
          className="-ml-1 flex size-11 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="size-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
        </Link>

        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-xl font-bold break-words sm:text-2xl">{classroom.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {classroom.section ? `${classroom.section} · ` : ""}
            {classroom.member_count} {classroom.member_count === 1 ? "member" : "members"}
          </p>
        </div>

        <p className="mt-2 shrink-0 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 font-mono text-xs font-semibold tracking-wider text-blue-300">
          <span className="sr-only">Class code </span>
          {classroom.code}
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
          {tab === "members" && (
            <MembersList
              classroomId={classroomId}
              initialMembers={sectionData as ClassroomMember[]}
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
