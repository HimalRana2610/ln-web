import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// In a real build the server actions reach the client as RPC stubs. Importing
// the module here would pull `server-only` into a client-side test.
vi.mock("@/app/(app)/dashboard/actions", () => ({
  deleteClassroom: vi.fn(),
  leaveClassroom: vi.fn(),
}));

import { ClassCard } from "@/components/classroom/class-card";
import type { Classroom } from "@/lib/api/types";

const classroom: Classroom = {
  id: "f37653ee-372a-4781-b56a-af69641466bb",
  name: "Operating Systems",
  section: "CS-402",
  code: "GEL2XA",
  type: "public",
  theme_color: "from-rose-500 to-pink-600",
  owner_id: "9f1c0f0e-2c0a-4d2f-9a1e-6f5a4b3c2d10",
  owner_name: "Himal Rana",
  my_role: "owner",
  member_count: 3,
  created_at: "2026-09-01T00:00:00Z",
};

/**
 * Hydrates the card against its own server markup.
 *
 * A hydration mismatch is only ever seen in a browser, as a dev overlay, and
 * the overlay cannot tell you whether the markup or the browser is at fault.
 * This pins the half we own: given the same props, the server and client
 * renders agree.
 *
 * `renderToString` and not `renderToStaticMarkup` — the static renderer omits
 * the `<!-- -->` separators that keep adjacent text nodes distinct, so it
 * reports a mismatch in the member-count line that real SSR does not have.
 */
describe("ClassCard", () => {
  it("hydrates its own server markup without a mismatch", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<ClassCard classroom={classroom} />);
    document.body.appendChild(container);

    const onRecoverableError = vi.fn();

    await act(async () => {
      hydrateRoot(container, <ClassCard classroom={classroom} />, { onRecoverableError });
    });

    const messages = onRecoverableError.mock.calls.map(([error]) =>
      error instanceof Error ? error.message : String(error),
    );

    expect(messages).toEqual([]);
  });

  it("hydrates cleanly for a class with no section and a single member", async () => {
    // The section is conditionally rendered, so it is the one place in the card
    // where the two renders could disagree on structure rather than text.
    const solo: Classroom = {
      ...classroom,
      section: null,
      member_count: 1,
      my_role: "student",
    };

    const container = document.createElement("div");
    container.innerHTML = renderToString(<ClassCard classroom={solo} />);
    document.body.appendChild(container);

    const onRecoverableError = vi.fn();

    await act(async () => {
      hydrateRoot(container, <ClassCard classroom={solo} />, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
  });

  it("clamps a long name inside the header and keeps the full name as a tooltip", () => {
    // Found in the Phase 7 screenshots: a four-line name spilled out of the
    // fixed-height header and over "Open class" and the role.
    const name =
      "Operating Systems — Process Scheduling, Memory Management and File Systems (Advanced Elective)";
    const container = document.createElement("div");
    container.innerHTML = renderToString(<ClassCard classroom={{ ...classroom, name }} />);

    const heading = container.querySelector("h2");
    expect(heading).toHaveAttribute("title", name);
    expect(heading?.className).toContain("line-clamp-2");
  });
});
