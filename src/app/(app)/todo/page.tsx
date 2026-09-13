import type { Metadata } from "next";

import { TodoList } from "@/components/todo/todo-list";
import { authedFetch } from "@/lib/api/server";
import type { ToDoItem } from "@/lib/api/types";
import { parseTodoTab } from "@/lib/todo";

export const metadata: Metadata = { title: "To-do" };

export default async function TodoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const tab = parseTodoTab((await searchParams).tab);
  // Already sorted soonest-due first, with statuses computed on the server.
  const items = await authedFetch<ToDoItem[]>("/me/todo");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">To-do</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Assignments from every class you are a student in.
        </p>
      </div>
      <TodoList items={items} active={tab} />
    </div>
  );
}
