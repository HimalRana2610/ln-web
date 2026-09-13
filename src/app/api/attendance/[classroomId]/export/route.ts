import { NextResponse } from "next/server";

import { getAccessToken } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";

/**
 * Streams the attendance spreadsheet from the backend.
 *
 * A route handler rather than a Server Action because the result is a file:
 * the browser downloads it through an ordinary link, with the filename the
 * backend chose, and the access token never leaves the httpOnly cookie.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classroomId: string }> },
): Promise<Response> {
  const { classroomId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: { code: "no_session", message: "Not signed in" } },
      { status: 401 },
    );
  }

  const upstream = await fetch(
    `${serverEnv.apiBaseUrl}/classrooms/${encodeURIComponent(classroomId)}/attendance/export`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );

  if (!upstream.ok) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ??
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment",
      "Cache-Control": "no-store",
    },
  });
}
