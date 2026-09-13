import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { formatLocal, LocalTime } from "@/components/post/local-time";

const DUE = "2026-09-20T18:14:00Z";

/**
 * Due dates must render in the viewer's timezone. The server does not know it,
 * so the server markup must carry no formatted time at all — and the browser
 * must fill it in without React reporting a hydration mismatch.
 */
describe("LocalTime", () => {
  it("renders no zone-dependent text on the server", () => {
    const html = renderToString(<LocalTime iso={DUE} withTime />);

    // The machine-readable attribute is zone-independent and fine to send.
    expect(html).toContain(`dateTime="${DUE}"`);

    const visibleText = html.replace(/<[^>]*>/g, "");
    expect(visibleText).not.toMatch(/\d/);
  });

  it("hydrates cleanly, then shows the time in the browser's zone", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<LocalTime iso={DUE} withTime />);
    document.body.appendChild(container);

    const onRecoverableError = vi.fn();
    await act(async () => {
      hydrateRoot(container, <LocalTime iso={DUE} withTime />, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toBe(formatLocal(DUE, true));
  });
});
