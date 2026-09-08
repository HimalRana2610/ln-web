import { NextResponse } from "next/server";

import { ApiError, apiFetch } from "@/lib/api/client";
import type { TokenPair, User } from "@/lib/api/types";
import { setSessionCookies } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validation/auth";

/**
 * Creates an account and signs the user straight in.
 *
 * The backend keeps register and login separate so an email-verification gate
 * can be added later; the web app chains them here purely for convenience. When
 * verification lands, drop the login call and redirect to a "check your inbox"
 * page instead.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = registerSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Check the details you entered" } },
      { status: 422 },
    );
  }

  const { email, password, fullName, institute } = parsed.data;

  try {
    await apiFetch<User>("/auth/register", {
      method: "POST",
      body: {
        email,
        password,
        full_name: fullName,
        institute: institute || null,
      },
    });

    const tokens = await apiFetch<TokenPair>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    await setSessionCookies(tokens);

    const user = await apiFetch<User>("/users/me", { accessToken: tokens.access_token });
    return NextResponse.json(user, { status: 201 });
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
