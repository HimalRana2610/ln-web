"use client";

import { useCallback, useState, useTransition } from "react";
import type { ReactNode } from "react";

import {
  answerQuestion,
  endQuestion,
  fetchQuiz,
  startQuestion,
} from "@/app/(app)/classroom/[classroomId]/quiz-actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { LeaderboardEntry, QuizOption, QuizQuestion, QuizState } from "@/lib/api/types";
import { useVisibleInterval } from "@/lib/use-visible-interval";
import { cn } from "@/lib/utils";

const QUIZ_OPTIONS: QuizOption[] = ["A", "B", "C", "D"];

interface QuizPanelProps {
  classroomId: string;
  initialState: QuizState;
  canManage: boolean;
}

/**
 * Live quiz, ported from the old QuizTab.
 *
 * The old app had Firestore listeners; this polls at the interval the backend
 * asks for, and only while the browser tab is visible.
 */
export function QuizPanel({ classroomId, initialState, canManage }: QuizPanelProps) {
  const [state, setState] = useState(initialState);
  const [syncedFrom, setSyncedFrom] = useState(initialState);

  if (syncedFrom !== initialState) {
    setSyncedFrom(initialState);
    setState(initialState);
  }

  const refresh = useCallback(async () => {
    const result = await fetchQuiz(classroomId);
    if (result.ok) setState(result.data);
  }, [classroomId]);

  useVisibleInterval(refresh, Math.max(1, state.poll_interval_seconds) * 1000);

  // With nothing live, the most recent question stays up so its result shows.
  const shown = state.active ?? state.recent[0] ?? null;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Quiz</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {canManage && !state.active && (
            <QuestionComposer classroomId={classroomId} onStarted={refresh} />
          )}

          {!canManage && !state.active && (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No question is live. It appears here when your teacher starts one.
              </p>
            </div>
          )}

          {shown &&
            (canManage ? (
              <TeacherQuestion key={shown.id} question={shown} onEnded={refresh} />
            ) : (
              // Keyed so a new question never inherits the last one's choice.
              <StudentQuestion key={shown.id} question={shown} onAnswered={refresh} />
            ))}
        </div>

        <Leaderboard entries={state.leaderboard} />
      </div>
    </>
  );
}

function QuestionComposer({
  classroomId,
  onStarted,
}: {
  classroomId: string;
  onStarted: () => Promise<void>;
}) {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState<QuizOption>("A");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await startQuestion(classroomId, {
            prompt,
            options,
            correct_option: correct,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setPrompt("");
          setOptions(["", "", "", ""]);
          await onStarted();
        });
      }}
    >
      <h3 className="font-semibold text-slate-900 dark:text-white">New question</h3>
      {error && <Alert>{error}</Alert>}
      <Field label="Question" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      {QUIZ_OPTIONS.map((letter, index) => (
        <div key={letter} className="flex items-end gap-3">
          <div className="flex-1">
            <Field
              label={`Option ${letter}`}
              value={options[index]}
              onChange={(e) =>
                setOptions((current) =>
                  current.map((value, i) => (i === index ? e.target.value : value)),
                )
              }
            />
          </div>
          <label className="mb-3 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="radio"
              name="correct_option"
              checked={correct === letter}
              onChange={() => setCorrect(letter)}
              aria-label={`${letter} is correct`}
            />
            Correct
          </label>
        </div>
      ))}
      <Button type="submit" isLoading={pending} className="self-start">
        Start question
      </Button>
    </form>
  );
}

function QuestionCard({ question, children }: { question: QuizQuestion; children: ReactNode }) {
  const live = question.status === "active";
  return (
    <section
      aria-label={live ? "Live question" : "Last question"}
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {live ? "Live" : "Ended"} · {question.answer_count}{" "}
        {question.answer_count === 1 ? "answer" : "answers"}
      </p>
      <p className="font-semibold text-slate-900 dark:text-white">{question.prompt}</p>
      {children}
    </section>
  );
}

function TeacherQuestion({
  question,
  onEnded,
}: {
  question: QuizQuestion;
  onEnded: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <QuestionCard question={question}>
      <ul className="flex flex-col gap-1.5 text-sm">
        {QUIZ_OPTIONS.map((letter, index) => (
          <li
            key={letter}
            className={cn(
              "rounded-lg px-3 py-2",
              question.correct_option === letter
                ? "bg-green-50 font-medium text-green-800 dark:bg-green-950/50 dark:text-green-200"
                : "text-slate-700 dark:text-slate-300",
            )}
          >
            {letter}. {question.options[index]}
          </li>
        ))}
      </ul>
      {error && <Alert>{error}</Alert>}
      {question.status === "active" && (
        <Button
          isLoading={pending}
          className="self-start"
          onClick={() =>
            startTransition(async () => {
              const result = await endQuestion(question.id);
              if (!result.ok) setError(result.error);
              await onEnded();
            })
          }
        >
          End question
        </Button>
      )}
    </QuestionCard>
  );
}

function StudentQuestion({
  question,
  onAnswered,
}: {
  question: QuizQuestion;
  onAnswered: () => Promise<void>;
}) {
  // Locks the buttons straight away, before the next poll returns `my_option`.
  const [chosen, setChosen] = useState<QuizOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mine = question.my_option ?? chosen;
  const ended = question.status === "ended";
  const locked = mine !== null || ended || pending;

  return (
    <QuestionCard question={question}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {QUIZ_OPTIONS.map((letter, index) => (
          <button
            key={letter}
            type="button"
            disabled={locked}
            aria-pressed={mine === letter}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await answerQuestion(question.id, letter);
                if (result.ok) setChosen(letter);
                else setError(result.error);
                await onAnswered();
              });
            }}
            className={cn(
              "rounded-xl border px-3 py-3 text-left text-sm transition disabled:cursor-not-allowed",
              ended && question.correct_option === letter
                ? "border-green-500 bg-green-50 text-green-900 dark:bg-green-950/50 dark:text-green-100"
                : mine === letter
                  ? "border-slate-900 bg-slate-100 dark:border-white dark:bg-slate-800"
                  : "border-slate-200 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800",
            )}
          >
            <span className="font-bold">{letter}.</span> {question.options[index]}
          </button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      {!ended && mine && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Answer locked in. The result appears when your teacher ends the question.
        </p>
      )}
      {ended && (
        <p
          className={cn(
            "text-sm font-medium",
            question.my_is_correct
              ? "text-green-700 dark:text-green-400"
              : "text-slate-600 dark:text-slate-300",
          )}
        >
          {question.my_option === null
            ? `You did not answer. The answer was ${question.correct_option}.`
            : question.my_is_correct
              ? "Correct!"
              : `Not quite — the answer was ${question.correct_option}.`}
        </p>
      )}
    </QuestionCard>
  );
}

/** Rendered in the order the server ranked it; never re-sorted here. */
function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Leaderboard</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No answers yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" aria-label="Leaderboard">
            <thead className="text-xs text-slate-500 uppercase dark:text-slate-400">
              <tr>
                <th className="py-2 pr-3">Rank</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3 text-right">Correct</th>
                <th className="py-2 text-right">Penalty (s)</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-300">
              {entries.map((entry) => (
                <tr
                  key={entry.student_id}
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  <td className="py-2 pr-3 font-semibold">{entry.rank}</td>
                  <td className="py-2 pr-3">{entry.student_name}</td>
                  <td className="py-2 pr-3 text-right">
                    {entry.correct}/{entry.answered}
                  </td>
                  <td className="py-2 text-right">{entry.penalty_seconds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
