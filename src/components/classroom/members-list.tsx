"use client";

import { useState, useTransition } from "react";

import { removeMember } from "@/app/(app)/classroom/[classroomId]/member-actions";
import { Button } from "@/components/ui/button";
import type { ClassroomMember, MemberRole } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const ROLE_ORDER: Record<MemberRole, number> = { owner: 0, teacher: 1, student: 2 };

const ROLE_BADGE: Record<MemberRole, { label: string; className: string }> = {
  owner: {
    label: "Owner",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  },
  teacher: {
    label: "Teacher",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  },
  student: {
    label: "Student",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  },
};

/** Avatar colours from the old MembersList, picked by position. */
const AVATAR = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-sky-600",
  "bg-teal-600",
  "bg-violet-500",
  "bg-rose-500",
];

interface MembersListProps {
  classroomId: string;
  initialMembers: ClassroomMember[];
  canManage: boolean;
}

/** Ported from the old app's MembersList: everyone in the class, teachers first. */
export function MembersList({ classroomId, initialMembers, canManage }: MembersListProps) {
  const [members, setMembers] = useState(() =>
    [...initialMembers].sort(
      (a, b) =>
        ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.full_name.localeCompare(b.full_name),
    ),
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Class members</h2>
        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          {members.length}
          <span className="sr-only"> members</span>
        </span>
      </div>

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
        {members.map((member, index) => (
          <MemberRow
            key={member.id}
            member={member}
            colour={AVATAR[index % AVATAR.length]}
            classroomId={classroomId}
            canRemove={canManage && member.role === "student"}
            onRemoved={() => setMembers((current) => current.filter((m) => m.id !== member.id))}
          />
        ))}
      </ul>
    </>
  );
}

function MemberRow({
  member,
  colour,
  classroomId,
  canRemove,
  onRemoved,
}: {
  member: ClassroomMember;
  colour: string;
  classroomId: string;
  canRemove: boolean;
  onRemoved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const badge = ROLE_BADGE[member.role];

  function remove() {
    if (!window.confirm(`Remove ${member.full_name} from this class?`)) return;
    startTransition(async () => {
      const result = await removeMember(classroomId, member.user_id);
      if (result.ok) onRemoved();
      else window.alert(result.error);
    });
  }

  return (
    <li className={cn("flex items-center gap-3 px-4 py-3", isPending && "opacity-60")}>
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full font-semibold text-white",
          colour,
        )}
      >
        {member.full_name.trim().charAt(0).toUpperCase() || "?"}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium break-words text-slate-900 dark:text-white">
            {member.full_name}
          </span>
          {/* Text, not just colour, carries the role. */}
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        </p>
        <p className="truncate text-sm text-slate-500 dark:text-slate-400">{member.email}</p>
      </div>

      {canRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={remove}
          isLoading={isPending}
          aria-label={`Remove ${member.full_name}`}
        >
          Remove
        </Button>
      )}
    </li>
  );
}
