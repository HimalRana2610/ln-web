/**
 * Classroom form schemas.
 *
 * Mirrors `app/schemas/classroom.py`. Client-side validation is a convenience;
 * the backend validates independently and is the only enforcement.
 */

import { z } from "zod";

export const CLASS_CODE_LENGTH = 6;

/** Kept in step with `THEME_COLORS` in `app/schemas/classroom.py`. */
export const THEME_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-blue-500 to-sky-500",
  "from-blue-600 to-cyan-600",
  "from-green-500 to-emerald-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-purple-600",
  "from-slate-600 to-slate-800",
] as const;

export const createClassroomSchema = z.object({
  name: z.string().min(1, "Enter a class name").max(200, "That name is too long"),
  section: z.string().max(120, "That is too long").optional().or(z.literal("")),
  type: z.enum(["personal", "public"]),
  theme_color: z.enum(THEME_COLORS),
});

export const joinClassroomSchema = z.object({
  code: z
    .string()
    .trim()
    .length(CLASS_CODE_LENGTH, `Class codes are ${CLASS_CODE_LENGTH} characters`)
    .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only")
    // Codes are stored uppercase; accept whatever case was typed.
    .transform((value) => value.toUpperCase()),
});

export type CreateClassroomValues = z.infer<typeof createClassroomSchema>;
export type JoinClassroomValues = z.infer<typeof joinClassroomSchema>;
