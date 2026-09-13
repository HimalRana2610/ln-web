import Link from "next/link";

import { LocalTime } from "@/components/post/local-time";
import type { ToDoItem, ToDoStatus } from "@/lib/api/types";
import { groupTodo, TODO_TABS } from "@/lib/todo";
import { cn } from "@/lib/utils";

const EMPTY: Record<ToDoStatus, string> = {
  assigned: "Nothing due. Nice.",
  missing: "Nothing missing.",
  done: "Nothing handed in yet.",
};

/** Ported from the old ToDo page. Tabs are links, like the classroom's. */
export function TodoList({ items, active }: { items: ToDoItem[]; active: ToDoStatus }) {
  const groups = groupTodo(items);
  const visible = groups[active];

  return (
    <div>
      <nav
        aria-label="To-do sections"
        className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700"
      >
        {TODO_TABS.map(({ value, label }) => (
          <Link
            key={value}
            href={value === "assigned" ? "/todo" : `/todo?tab=${value}`}
            aria-current={active === value ? "page" : undefined}
            scroll={false}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition",
              active === value
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {label}{" "}
            <span className="text-slate-500 dark:text-slate-400">{groups[value].length}</span>
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">{EMPTY[active]}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" aria-label={`${active} work`}>
          {visible.map((item) => (
            <li key={item.post_id}>
              <Link
                href={`/classroom/${item.classroom_id}?tab=assignments`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {item.classroom_name}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
                  {item.status === "done" && item.submitted_at ? (
                    <p>
                      {item.is_late ? "Handed in late " : "Handed in "}
                      <LocalTime iso={item.submitted_at} />
                    </p>
                  ) : item.due_date ? (
                    <p
                      className={cn(
                        item.status === "missing" && "text-red-600 dark:text-red-400",
                      )}
                    >
                      Due <LocalTime iso={item.due_date} withTime />
                    </p>
                  ) : (
                    <p>No due date</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
