"use server";

import { revalidatePath } from "next/cache";

import { authedFetch, runAction, type ActionResult } from "@/lib/api/server";
import type { User } from "@/lib/api/types";
import { clearSessionCookies } from "@/lib/auth/session";

/** Server Actions for the settings page and push registration. */

export async function updateProfile(input: {
  full_name: string;
  institute: string;
}): Promise<ActionResult<User>> {
  const fullName = input.full_name.trim();
  if (!fullName) {
    return { ok: false, code: "validation_error", error: "Enter your name" };
  }
  const result = await runAction(() =>
    authedFetch<User>("/users/me", {
      method: "PATCH",
      body: { full_name: fullName, institute: input.institute.trim() || null },
    }),
  );
  // The header shows the name on every page.
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/**
 * Deletes the account, then the session cookies with it — the tokens now name
 * a user who no longer exists. Server Actions may write cookies.
 */
export async function deleteAccount(password: string): Promise<ActionResult<void>> {
  if (!password) {
    return { ok: false, code: "validation_error", error: "Enter your password" };
  }
  const result = await runAction(() =>
    authedFetch<void>("/users/me/delete", { method: "POST", body: { password } }),
  );
  if (result.ok) await clearSessionCookies();
  return result;
}

export async function registerPushToken(token: string): Promise<ActionResult<void>> {
  return runAction(() =>
    authedFetch<void>("/me/devices/push-token", {
      method: "POST",
      body: { token, platform: "web" },
    }),
  );
}

export async function removePushToken(token: string): Promise<ActionResult<void>> {
  return runAction(() =>
    authedFetch<void>("/me/devices/push-token/remove", { method: "POST", body: { token } }),
  );
}
