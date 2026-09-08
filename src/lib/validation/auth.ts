/**
 * Form and payload schemas.
 *
 * Shared by the client forms and the route handlers, so the browser gets instant
 * feedback and the server still validates independently — a client-side check is
 * a convenience, never a control.
 *
 * Rules mirror `app/schemas/auth.py`; keep them in step.
 */

import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 10;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(128, "That is longer than 128 characters")
  .refine((value) => value.trim() === value, "Cannot start or end with a space")
  .refine((value) => new Set(value).size >= 4, "Too repetitive to be a good password");

export const loginSchema = z.object({
  email: z.string().min(1, "Enter your email").email("That does not look like an email"),
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(1, "Enter your name").max(200, "That name is too long"),
    email: z.string().min(1, "Enter your email").email("That does not look like an email"),
    institute: z.string().max(200, "That is too long").optional().or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
