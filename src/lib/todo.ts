/**
 * To-do grouping. A plain module so the server page and the list component
 * share one definition of the tabs.
 */

import type { ToDoItem, ToDoStatus } from "@/lib/api/types";

export const TODO_TABS = [
  { value: "assigned", label: "Assigned" },
  { value: "missing", label: "Missing" },
  { value: "done", label: "Done" },
] as const satisfies ReadonlyArray<{ value: ToDoStatus; label: string }>;

export function parseTodoTab(value: string | string[] | undefined): ToDoStatus {
  const candidate = Array.isArray(value) ? value[0] : value;
  return TODO_TABS.find((tab) => tab.value === candidate)?.value ?? "assigned";
}

/**
 * Buckets items by the server's `status`, keeping the server's order within
 * each. Status is never recomputed here: the client clock may be wrong.
 */
export function groupTodo(items: ToDoItem[]): Record<ToDoStatus, ToDoItem[]> {
  const groups: Record<ToDoStatus, ToDoItem[]> = { assigned: [], missing: [], done: [] };
  for (const item of items) groups[item.status].push(item);
  return groups;
}
