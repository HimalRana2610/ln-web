import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/classroom/[classroomId]/member-actions", () => ({
  removeMember: vi.fn(),
}));

import { MembersList } from "@/components/classroom/members-list";
import type { ClassroomMember } from "@/lib/api/types";

function member(overrides: Partial<ClassroomMember>): ClassroomMember {
  return {
    id: overrides.user_id ?? "m",
    user_id: "u",
    email: "someone@example.com",
    full_name: "Someone",
    role: "student",
    joined_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

const members = [
  member({ user_id: "s2", full_name: "Zara Student" }),
  member({ user_id: "o", full_name: "Priya Sharma", role: "owner" }),
  member({ user_id: "s1", full_name: "Kiran Bahadur Gurung-Lamichhane" }),
];

function names() {
  return within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((row) => row.querySelector("p span")?.textContent);
}

describe("MembersList", () => {
  it("lists the owner first, then students by name, with a count", () => {
    render(<MembersList classroomId="c" initialMembers={members} canManage />);

    expect(names()).toEqual([
      "Priya Sharma",
      "Kiran Bahadur Gurung-Lamichhane",
      "Zara Student",
    ]);
    expect(screen.getByText("3")).toHaveTextContent("3 members");
  });

  it("names the role in text, not only colour", () => {
    render(<MembersList classroomId="c" initialMembers={members} canManage />);
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getAllByText("Student")).toHaveLength(2);
  });

  it("lets a teacher remove students but never the owner", () => {
    render(<MembersList classroomId="c" initialMembers={members} canManage />);

    expect(screen.getByRole("button", { name: "Remove Zara Student" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Priya Sharma" })).toBeNull();
  });

  it("gives a student no remove controls", () => {
    render(<MembersList classroomId="c" initialMembers={members} canManage={false} />);
    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
  });
});
