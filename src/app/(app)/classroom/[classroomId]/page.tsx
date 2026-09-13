import type { Metadata } from "next";
import Link from "next/link";

import { ClassroomTabs } from "@/components/classroom/classroom-tabs";
import { NoteList } from "@/components/note/note-list";
import { AssignmentList } from "@/components/post/assignment-list";
import { PostFeed } from "@/components/post/post-feed";
import { fetchOr404 } from "@/lib/api/fetch-or-404";
import { authedFetch } from "@/lib/api/server";
import type { Classroom, NoteSummary, Post } from "@/lib/api/types";
import { parseTab, type ClassroomTab } from "@/lib/classroom-tabs";

export const metadata: Metadata = { title: "Classroom" };

const POST_KIND: Record<Exclude<ClassroomTab, "notes">, Post["kind"]> = {
  stream: "announcement",
  materials: "material",
  assignments: "assignment",
};

export default async function ClassroomPage({
  params,
  searchParams,
}: {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { classroomId } = await params;
  const tab = parseTab((await searchParams).tab);

  // Only the visible section is fetched. The classroom itself is always
  // loaded, which is also what turns a non-member's visit into a 404.
  const [classroom, sectionData] = await fetchOr404(() =>
    Promise.all([
      authedFetch<Classroom>(`/classrooms/${classroomId}`),
      tab === "notes"
        ? authedFetch<NoteSummary[]>(`/classrooms/${classroomId}/notes`)
        : authedFetch<Post[]>(`/classrooms/${classroomId}/posts?kind=${POST_KIND[tab]}`),
    ]),
  );

  const canManage = classroom.my_role !== "student";

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

      <ClassroomTabs active={tab}>
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
        </section>
      </ClassroomTabs>
    </div>
  );
}
