import type { Metadata } from "next";
import Link from "next/link";

import { MarkdownView } from "@/components/note/markdown-view";
import { PrintButton } from "@/components/note/print-button";
import { fetchOr404 } from "@/lib/api/fetch-or-404";
import { authedFetch } from "@/lib/api/server";
import type { Note } from "@/lib/api/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ noteId: string }>;
}): Promise<Metadata> {
  const { noteId } = await params;
  try {
    const note = await authedFetch<Note>(`/notes/${noteId}`);
    return { title: note.title };
  } catch {
    // Metadata must never break the page; the title falls back.
    return { title: "Note" };
  }
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ classroomId: string; noteId: string }>;
}) {
  const { classroomId, noteId } = await params;
  const note = await fetchOr404(() => authedFetch<Note>(`/notes/${noteId}`));

  return (
    <article className="flex flex-col gap-6">
      <div className="print-hidden flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/classroom/${classroomId}`}
            className="text-sm text-slate-500 hover:underline dark:text-slate-400"
          >
            ← Back to class
          </Link>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {new Date(note.date).toLocaleDateString()} · {note.author_name}
          </p>
        </div>
        {note.status === "ready" && <PrintButton />}
      </div>

      <div className="print-surface rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 dark:border-slate-800 dark:bg-slate-900">
        {note.status === "ready" ? (
          <MarkdownView markdown={note.markdown} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {note.status === "failed"
              ? (note.error_message ?? "Generation failed.")
              : "Still generating. Reload in a moment."}
          </p>
        )}
      </div>
    </article>
  );
}
