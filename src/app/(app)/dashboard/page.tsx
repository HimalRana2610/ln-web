import type { Metadata } from "next";

import { ClassroomBoard } from "@/components/classroom/classroom-board";
import { authedFetch } from "@/lib/api/server";
import type { Classroom } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // The layout already guaranteed a session; both reads are served from the
  // same request's cache rather than causing extra round trips.
  const [user, classrooms] = await Promise.all([
    getCurrentUser(),
    authedFetch<Classroom[]>("/classrooms"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Welcome, {user?.full_name}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {classrooms.length === 0
            ? "Create a class, or join one with a code."
            : `You are in ${classrooms.length} ${classrooms.length === 1 ? "class" : "classes"}.`}
        </p>
      </div>

      <ClassroomBoard classrooms={classrooms} />
    </div>
  );
}
