/**
 * Classroom page sections. A plain module rather than part of the tab
 * component, because the server page parses `?tab=` too, and a Server Component
 * cannot call a function exported from a `"use client"` file.
 */

export const CLASSROOM_TABS = [
  { value: "stream", label: "Stream" },
  { value: "materials", label: "Materials" },
  { value: "assignments", label: "Assignments" },
  { value: "notes", label: "Notes" },
] as const;

export type ClassroomTab = (typeof CLASSROOM_TABS)[number]["value"];

/** Unknown or missing values fall back to the stream rather than a 404. */
export function parseTab(value: string | string[] | undefined): ClassroomTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return CLASSROOM_TABS.find((tab) => tab.value === candidate)?.value ?? "stream";
}
