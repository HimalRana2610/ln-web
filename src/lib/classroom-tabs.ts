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
  { value: "attendance", label: "Attendance" },
  { value: "quiz", label: "Quiz" },
  { value: "security", label: "Security", teacherOnly: true },
] as const;

export type ClassroomTab = (typeof CLASSROOM_TABS)[number]["value"];

/** The tabs this viewer may open. */
export function visibleTabs(canManage: boolean) {
  return CLASSROOM_TABS.filter((tab) => canManage || !("teacherOnly" in tab));
}

/**
 * Unknown or missing values fall back to the stream rather than a 404, and so
 * does a teacher-only tab asked for by a student.
 */
export function parseTab(value: string | string[] | undefined, canManage = true): ClassroomTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return visibleTabs(canManage).find((tab) => tab.value === candidate)?.value ?? "stream";
}
