import { NextResponse } from "next/server";

import { ApiError, apiFetch } from "@/lib/api/client";
import type { TokenPair, User } from "@/lib/api/types";
import { setSessionCookies } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";

/**
 * Exchanges credentials for a session.
 *
 * The token pair is written to httpOnly cookies and never returned to the
 * browser, so client JavaScript has no way to read or exfiltrate it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Check the details you entered" } },
      { status: 422 },
    );
  }

  try {
    const tokens = await apiFetch<TokenPair>("/auth/login", {
      method: "POST",
      body: parsed.data,
    });
    await setSessionCookies(tokens);

    const user = await apiFetch<User>("/users/me", { accessToken: tokens.access_token });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    throw error;
  }
}
