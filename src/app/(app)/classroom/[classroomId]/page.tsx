import type { Metadata } from "next";
import Link from "next/link";

import { NoteList } from "@/components/note/note-list";
import { fetchOr404 } from "@/lib/api/fetch-or-404";
import { authedFetch } from "@/lib/api/server";
import type { Classroom, NoteSummary } from "@/lib/api/types";

export const metadata: Metadata = { title: "Classroom" };

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;

  const [classroom, notes] = await fetchOr404(() =>
    Promise.all([
      authedFetch<Classroom>(`/classrooms/${classroomId}`),
      authedFetch<NoteSummary[]>(`/classrooms/${classroomId}/notes`),
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
          {classroom.member_count}{" "}
          {classroom.member_count === 1 ? "member" : "members"} · Code{" "}
          <code className="font-mono">{classroom.code}</code>
        </p>
      </div>

      <section>
        <NoteList classroomId={classroomId} initialNotes={notes} canManage={canManage} />
      </section>
    </div>
  );
}
