import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ToDoItem } from "@/lib/api/types";

import { TodoList } from "../todo-list";

function item(overrides: Partial<ToDoItem> = {}): ToDoItem {
  return {
    post_id: "p1",
    classroom_id: "c1",
    classroom_name: "Physics",
    title: "Lab report",
    description: null,
    due_date: "2026-09-20T18:14:00Z",
    author_name: "Grace Hopper",
    created_at: "2026-09-10T00:00:00Z",
    submitted_at: null,
    is_late: false,
    status: "assigned",
    ...overrides,
  };
}

/**
 * Status comes from the server. A due date in the distant past marked
 * `assigned` must still show under Assigned — the client clock never decides.
 */
describe("TodoList", () => {
  const items = [
    item({ post_id: "a", title: "Overdue but assigned", due_date: "2000-01-01T00:00:00Z" }),
    item({ post_id: "m", title: "Missing essay", status: "missing" }),
    item({
      post_id: "d",
      title: "Done quiz",
      status: "done",
      submitted_at: "2026-09-11T00:00:00Z",
    }),
    item({ post_id: "b", title: "Undated reading", due_date: null }),
  ];

  it("groups by the server's status verbatim, keeping server order", () => {
    render(<TodoList items={items} active="assigned" />);

    const list = screen.getByRole("list", { name: "assigned work" });
    const titles = within(list)
      .getAllByRole("link")
      .map((link) => link.querySelector("p")?.textContent);
    expect(titles).toEqual(["Overdue but assigned", "Undated reading"]);
    expect(screen.queryByText("Missing essay")).toBeNull();
    expect(screen.queryByText("Done quiz")).toBeNull();
  });

  it("shows counts on each tab and links items to the assignments tab", () => {
    render(<TodoList items={items} active="missing" />);

    expect(screen.getByRole("link", { name: "Assigned 2" })).toHaveAttribute("href", "/todo");
    expect(screen.getByRole("link", { name: "Missing 1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Missing essay").closest("a")).toHaveAttribute(
      "href",
      "/classroom/c1?tab=assignments",
    );
  });

  it("explains an empty section", () => {
    render(<TodoList items={[]} active="done" />);
    expect(screen.getByText("Nothing handed in yet.")).toBeInTheDocument();
  });
});
