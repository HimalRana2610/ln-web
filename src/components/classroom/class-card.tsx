"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import type { Classroom } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { deleteClassroom, leaveClassroom } from "@/app/(app)/dashboard/actions";

const ROLE_LABEL: Record<Classroom["my_role"], string> = {
  owner: "Owner",
  teacher: "Teacher",
  student: "Student",
};

interface ClassCardProps {
  classroom: Classroom;
}

/**
 * Class card, matching the old app: gradient header with an overlapping avatar
 * tile, then role and join code on a white body.
 *
 * `theme_color` is a Tailwind gradient pair stored in the database. Tailwind
 * generates utilities by scanning source text, so a class that exists only in a
 * database row would never be compiled — the full palette is written out as
 * string literals in `lib/validation/classroom.ts`, which is what makes these
 * dynamic classes work.
 */
export function ClassCard({ classroom }: ClassCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isOwner = classroom.my_role === "owner";
  const initial = classroom.name.trim().charAt(0).toUpperCase() || "?";

  function handleDestructiveAction() {
    const confirmed = window.confirm(
      isOwner
        ? `Delete "${classroom.name}"? This removes it for every member and cannot be undone.`
        : `Leave "${classroom.name}"?`,
    );
    if (!confirmed) return;

    setMenuOpen(false);
    startTransition(async () => {
      const result = isOwner
        ? await deleteClassroom(classroom.id)
        : await leaveClassroom(classroom.id);
      if (!result.ok) window.alert(result.error);
    });
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition",
        "hover:shadow-md dark:bg-slate-900 dark:ring-slate-800",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      {/* Gradient header */}
      <div
        className={cn(
          "relative h-36 bg-gradient-to-br px-5 pt-5",
          classroom.theme_color,
        )}
      >
        <h3 className="pr-10 text-2xl leading-tight font-bold text-white">
          {classroom.name}
        </h3>
        {classroom.section && (
          <p className="mt-1 text-sm text-white/80">{classroom.section}</p>
        )}

        {/* Overflow menu */}
        <div className="absolute top-4 right-3">
          <button
            type="button"
            aria-label="Class options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-full px-2 py-1 text-white/90 transition hover:bg-white/20"
          >
            <span aria-hidden className="text-xl leading-none">
              ⋮
            </span>
          </button>

          {menuOpen && (
            <>
              {/* Click-away layer, so the menu closes on any outside click. */}
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDestructiveAction}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  {isOwner ? "Delete class" : "Leave class"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Avatar tile, overlapping the header edge */}
        <div className="absolute -bottom-6 right-5 rounded-2xl bg-white p-1.5 shadow-sm dark:bg-slate-900">
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-xl bg-gradient-to-br",
              classroom.theme_color,
            )}
          >
            <span className="text-2xl font-bold text-white">{initial}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-6 pb-5">
        <Link
          href={`/classroom/${classroom.id}`}
          className="mb-4 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Open class →
        </Link>

        <dl>
          <dt className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Role
          </dt>
          <dd className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">
            {ROLE_LABEL[classroom.my_role]}
          </dd>
        </dl>

        <hr className="my-4 border-slate-200 dark:border-slate-800" />

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">Class Code</span>
          <code className="rounded-md bg-slate-100 px-3 py-1 font-mono text-sm tracking-wider text-slate-800 dark:bg-slate-800 dark:text-slate-100">
            {classroom.code}
          </code>
        </div>

        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          {classroom.member_count}{" "}
          {classroom.member_count === 1 ? "member" : "members"} · {classroom.owner_name}
        </p>
      </div>
    </article>
  );
}
