/**
 * Validated environment access.
 *
 * Reading `process.env` anywhere else is a mistake waiting to happen: a typo
 * silently becomes `undefined` and surfaces as a confusing runtime error much
 * later. Validating here means a missing variable fails loudly at startup.
 */

import { z } from "zod";

const serverSchema = z.object({
  /** Base URL of the FastAPI service, including the /api/v1 prefix. */
  API_BASE_URL: z.string().url(),
  /** Cookies are only marked Secure outside development. */
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

function loadServerEnv() {
  const parsed = serverSchema.safeParse({
    API_BASE_URL: process.env.API_BASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${issues}`);
  }

  return {
    apiBaseUrl: parsed.data.API_BASE_URL.replace(/\/$/, ""),
    isProduction: parsed.data.NODE_ENV === "production",
  };
}

export const serverEnv = loadServerEnv();
