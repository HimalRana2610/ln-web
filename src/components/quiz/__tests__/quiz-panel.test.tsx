import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuizQuestion, QuizState } from "@/lib/api/types";

import { QuizPanel } from "../quiz-panel";

const actions = vi.hoisted(() => ({
  fetchQuiz: vi.fn(),
  startQuestion: vi.fn(),
  endQuestion: vi.fn(),
  answerQuestion: vi.fn(),
}));

vi.mock("@/app/(app)/classroom/[classroomId]/quiz-actions", () => actions);

function question(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: "q1",
    classroom_id: "c1",
    prompt: "What is 2 + 2?",
    options: ["3", "4", "5", "22"],
    status: "active",
    started_at: "2026-09-14T03:15:00Z",
    ended_at: null,
    correct_option: null,
    answer_count: 0,
    my_option: null,
    my_is_correct: null,
    ...overrides,
  };
}

function state(overrides: Partial<QuizState> = {}): QuizState {
  return { active: null, recent: [], leaderboard: [], poll_interval_seconds: 3, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  actions.fetchQuiz.mockResolvedValue({ ok: false, error: "offline", code: "x" });
});

describe("QuizPanel", () => {
  it("gives students answer buttons with no hint of the correct option", () => {
    render(
      <QuizPanel
        classroomId="c1"
        initialState={state({ active: question() })}
        canManage={false}
      />,
    );

    const live = screen.getByRole("region", { name: "Live question" });
    for (const letter of ["A", "B", "C", "D"]) {
      expect(
        within(live).getByRole("button", { name: new RegExp(`^${letter}\\.`) }),
      ).toBeEnabled();
    }
    expect(screen.queryByText(/answer was/)).toBeNull();
    expect(screen.queryByRole("button", { name: "End question" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start question" })).toBeNull();
  });

  it("disables every option once a student has answered", async () => {
    actions.answerQuestion.mockResolvedValue({
      ok: true,
      data: { option: "B", is_correct: true, penalty_seconds: 2 },
    });
    render(
      <QuizPanel
        classroomId="c1"
        initialState={state({ active: question() })}
        canManage={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^B\./ }));

    await waitFor(() => expect(screen.getByText(/Answer locked in/)).toBeInTheDocument());
    expect(actions.answerQuestion).toHaveBeenCalledWith("q1", "B");
    for (const button of screen.getAllByRole("button", { name: /^[A-D]\./ })) {
      expect(button).toBeDisabled();
    }
  });

  it("stays locked when the server already has the student's answer", () => {
    render(
      <QuizPanel
        classroomId="c1"
        initialState={state({ active: question({ my_option: "C" }) })}
        canManage={false}
      />,
    );
    expect(screen.getByRole("button", { name: /^C\./ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^A\./ })).toBeDisabled();
  });

  it("shows feedback after the question ends", () => {
    const ended = question({
      status: "ended",
      correct_option: "B",
      my_option: "A",
      my_is_correct: false,
    });
    render(
      <QuizPanel
        classroomId="c1"
        initialState={state({ recent: [ended] })}
        canManage={false}
      />,
    );
    expect(screen.getByText("Not quite — the answer was B.")).toBeInTheDocument();
  });

  it("gives teachers the composer, and End on a live question", () => {
    const { unmount } = render(<QuizPanel classroomId="c1" initialState={state()} canManage />);
    expect(screen.getByRole("button", { name: "Start question" })).toBeInTheDocument();
    unmount();

    render(
      <QuizPanel
        classroomId="c1"
        initialState={state({ active: question({ correct_option: "B", answer_count: 3 }) })}
        canManage
      />,
    );
    expect(screen.getByText(/3 answers/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End question" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start question" })).toBeNull();
  });

  it("renders the leaderboard in server order, not re-sorted", () => {
    const leaderboard = [
      {
        rank: 1,
        student_id: "s2",
        student_name: "Zed",
        correct: 3,
        answered: 3,
        penalty_seconds: 9,
      },
      {
        rank: 2,
        student_id: "s1",
        student_name: "Amy",
        correct: 3,
        answered: 3,
        penalty_seconds: 12,
      },
      {
        rank: 3,
        student_id: "s3",
        student_name: "Bob",
        correct: 1,
        answered: 2,
        penalty_seconds: 4,
      },
    ];
    render(<QuizPanel classroomId="c1" initialState={state({ leaderboard })} canManage />);

    const rows = within(screen.getByRole("table", { name: "Leaderboard" })).getAllByRole("row");
    expect(rows.slice(1).map((row) => row.textContent)).toEqual([
      "1Zed3/39",
      "2Amy3/312",
      "3Bob1/24",
    ]);
  });
});
