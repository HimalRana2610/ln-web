"use client";

import { useMemo, useState } from "react";

import { ClassCard } from "@/components/classroom/class-card";
import { CreateClassDialog } from "@/components/classroom/create-class-dialog";
import { JoinClassDialog } from "@/components/classroom/join-class-dialog";
import type { Classroom } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Tab = "public" | "personal";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "public", label: "Public" },
  // Stored as "personal" to match the old data; shown as "Private".
  { value: "personal", label: "Private" },
];

interface ClassroomBoardProps {
  classrooms: Classroom[];
}

/**
 * Dashboard body: the Public/Private segmented control, the card grid, and the
 * floating action button — laid out to match the old app.
 *
 * The classroom list arrives from the server component above, already fetched.
 * This component only handles selection and dialog state.
 */
export function ClassroomBoard({ classrooms }: ClassroomBoardProps) {
  const [tab, setTab] = useState<Tab>("public");
  const [dialog, setDialog] = useState<"create" | "join" | null>(null);

  const visible = useMemo(
    () => classrooms.filter((classroom) => classroom.type === tab),
    [classrooms, tab],
  );

  return (
    <>
      {/* Segmented control */}
      <div
        role="tablist"
        aria-label="Class visibility"
        className="mx-auto mb-6 flex w-full max-w-md gap-1 rounded-full bg-slate-200 p-1 dark:bg-slate-800"
      >
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "flex-1 rounded-full px-4 py-2 text-sm font-bold tracking-wide uppercase transition",
              tab === value
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          tab={tab}
          onCreate={() => setDialog("create")}
          onJoin={() => setDialog("join")}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((classroom) => (
            <ClassCard key={classroom.id} classroom={classroom} />
          ))}
        </div>
      )}

      {/* Floating action button */}
      <div className="fixed right-6 bottom-6 z-30 flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={() => setDialog("join")}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
        >
          Join with code
        </button>

        <button
          type="button"
          onClick={() => setDialog("create")}
          aria-label="Create a class"
          className="flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <span aria-hidden className="text-3xl leading-none font-light">
            +
          </span>
        </button>
      </div>

      <CreateClassDialog open={dialog === "create"} onClose={() => setDialog(null)} />
      <JoinClassDialog open={dialog === "join"} onClose={() => setDialog(null)} />
    </>
  );
}

function EmptyState({
  tab,
  onCreate,
  onJoin,
}: {
  tab: Tab;
  onCreate: () => void;
  onJoin: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No {tab === "public" ? "public" : "private"} classes yet.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={onCreate}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Create a class
        </button>
        <button
          type="button"
          onClick={onJoin}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Join with a code
        </button>
      </div>
    </div>
  );
}
