import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MarkdownView } from "../markdown-view";

const parse = vi.fn();
const run = vi.fn();

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    parse: (...args: unknown[]) => parse(...args),
    run: (...args: unknown[]) => run(...args),
  },
}));

// The component picks a Mermaid theme from the colour scheme; jsdom has no
// matchMedia.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn() }),
  );
  parse.mockReset();
  run.mockReset();
  run.mockResolvedValue(undefined);
});

const diagram = (body: string) => "```mermaid\n" + body + "\n```\n";

describe("MarkdownView mermaid handling", () => {
  it("renders a valid diagram through mermaid", async () => {
    parse.mockResolvedValue({ diagramType: "flowchart" });

    const { container } = render(
      <MarkdownView markdown={diagram("flowchart TD\nA[One] --> B[Two]")} />,
    );

    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    expect(container.querySelectorAll("pre.mermaid")).toHaveLength(1);
  });

  it("falls back to a code block when the diagram is invalid", async () => {
    // What Gemini actually produced: `+` is not a Mermaid connector.
    parse.mockResolvedValue(false);

    const { container } = render(
      <MarkdownView
        markdown={diagram("flowchart TD\nA[CO2] + B[RuBP] --> C[Fixed]")}
      />,
    );

    // The block must stop being a Mermaid target, so `run` never sees it and
    // the reader gets the source text instead of a red error graphic.
    await waitFor(() =>
      expect(container.querySelector("pre.mermaid")).toBeNull(),
    );
    expect(run).not.toHaveBeenCalled();
    expect(screen.getByText(/RuBP/)).toBeInTheDocument();
  });

  it("renders the valid diagram when only one of two is broken", async () => {
    parse.mockResolvedValueOnce(false).mockResolvedValueOnce({});

    const { container } = render(
      <MarkdownView
        markdown={
          diagram("flowchart TD\nA[X] + B[Y] --> C[Z]") +
          "\n" +
          diagram("flowchart TD\nD[Good] --> E[Fine]")
        }
      />,
    );

    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    expect(run.mock.calls[0][0].nodes).toHaveLength(1);
    expect(container.querySelectorAll("pre.mermaid")).toHaveLength(1);
  });

  it("survives parse itself throwing", async () => {
    parse.mockRejectedValue(new Error("boom"));

    const { container } = render(
      <MarkdownView markdown={diagram("flowchart TD\nA --> B")} />,
    );

    await waitFor(() =>
      expect(container.querySelector("pre.mermaid")).toBeNull(),
    );
    expect(run).not.toHaveBeenCalled();
  });
});
