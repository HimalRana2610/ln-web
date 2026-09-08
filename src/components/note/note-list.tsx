"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { deleteNote, fetchNotes } from "@/app/(app)/classroom/[classroomId]/actions";
import { CreateNoteDialog } from "@/components/note/create-note-dialog";
import { Button } from "@/components/ui/button";
import { IN_PROGRESS_STATUSES, type NoteSummary, type NoteStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** How often to re-check while something is still generating. */
const POLL_INTERVAL_MS = 3000;

const SOURCE_LABEL: Record<NoteSummary["source_type"], string> = {
  audio: "Recording",
  text: "Text",
  pdf: "PDF",
  youtube: "YouTube",
};

interface NoteListProps {
  classroomId: string;
  initialNotes: NoteSummary[];
  canManage: boolean;
}

export function NoteList({ classroomId, initialNotes, canManage }: NoteListProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [syncedFrom, setSyncedFrom] = useState(initialNotes);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Adopt a fresh server render (after a Server Action revalidates) without an
  // effect. React documents this "adjust state during render" pattern for
  // exactly this case; doing it in an effect would render the stale list once
  // first, then immediately re-render — a visible flicker as well as a lint
  // error.
  if (syncedFrom !== initialNotes) {
    setSyncedFrom(initialNotes);
    setNotes(initialNotes);
  }

  const anyGenerating = notes.some((note) => IN_PROGRESS_STATUSES.includes(note.status));

  // Generation is asynchronous, so the list refreshes itself until everything
  // has settled — then stops, rather than polling an idle page forever.
  useEffect(() => {
    if (!anyGenerating) return;

    let cancelled = false;
    const timer = setInterval(async () => {
      const result = await fetchNotes(classroomId);
      if (!cancelled && result.ok) setNotes(result.data);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [anyGenerating, classroomId]);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Notes</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          New note
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-14 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No notes yet. Record a lecture, upload audio, paste text, or drop in a
            YouTube link.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
            Create the first note
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              classroomId={classroomId}
              canManage={canManage}
              onDeleted={(id) => setNotes((current) => current.filter((n) => n.id !== id))}
            />
          ))}
        </ul>
      )}

      <CreateNoteDialog
        classroomId={classroomId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(note) => setNotes((current) => [note, ...current])}
      />
    </>
  );
}

function NoteRow({
  note,
  classroomId,
  canManage,
  onDeleted,
}: {
  note: NoteSummary;
  classroomId: string;
  canManage: boolean;
  onDeleted: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const generating = IN_PROGRESS_STATUSES.includes(note.status);

  function remove() {
    if (!window.confirm(`Delete "${note.title}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteNote(classroomId, note.id);
      if (result.ok) onDeleted(note.id);
      else window.alert(result.error);
    });
  }

  const body = (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900 dark:text-white">
          {note.title}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {new Date(note.date).toLocaleDateString()} · {SOURCE_LABEL[note.source_type]} ·{" "}
          {note.author_name}
        </p>
        {note.status === "failed" && note.error_message && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {note.error_message}
          </p>
        )}
      </div>
      <StatusBadge status={note.status} />
    </div>
  );

  return (
    <li
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      {note.status === "ready" ? (
        <Link
          href={`/classroom/${classroomId}/notes/${note.id}`}
          className="block hover:opacity-80"
        >
          {body}
        </Link>
      ) : (
        // A note that is still generating has nothing to show yet, and a failed
        // one has only its error — neither is worth a page of its own.
        <div className={generating ? "animate-pulse" : undefined}>{body}</div>
      )}

      {canManage && (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={remove} isLoading={isPending}>
            Delete
          </Button>
        </div>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: NoteStatus }) {
  const styles: Record<NoteStatus, string> = {
    pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    ready: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  };

  const label: Record<NoteStatus, string> = {
    pending: "Queued",
    processing: "Generating",
    ready: "Ready",
    failed: "Failed",
  };

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
        styles[status],
      )}
    >
      {label[status]}
    </span>
  );
}
