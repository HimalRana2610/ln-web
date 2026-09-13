"use server";

import { authedFetch, runAction, type ActionResult } from "@/lib/api/server";
import type { QuizAnswerResult, QuizOption, QuizQuestion, QuizState } from "@/lib/api/types";

/**
 * Server Actions for the quiz tab.
 *
 * The backend decides who may do what — teachers pose and end, students answer
 * once — and hides the correct option from students while a question is live.
 */

export async function fetchQuiz(classroomId: string): Promise<ActionResult<QuizState>> {
  return runAction(() => authedFetch<QuizState>(`/classrooms/${classroomId}/quiz`));
}

export async function startQuestion(
  classroomId: string,
  input: { prompt: string; options: string[]; correct_option: QuizOption },
): Promise<ActionResult<QuizQuestion>> {
  const prompt = input.prompt.trim();
  const options = input.options.map((option) => option.trim());
  if (!prompt || options.length !== 4 || options.some((option) => !option)) {
    return {
      ok: false,
      code: "validation_error",
      error: "Enter a question and all four options",
    };
  }
  return runAction(() =>
    authedFetch<QuizQuestion>(`/classrooms/${classroomId}/quiz/questions`, {
      method: "POST",
      body: { prompt, options, correct_option: input.correct_option },
    }),
  );
}

export async function endQuestion(questionId: string): Promise<ActionResult<QuizQuestion>> {
  return runAction(() =>
    authedFetch<QuizQuestion>(`/quiz/questions/${questionId}/end`, { method: "POST" }),
  );
}

export async function answerQuestion(
  questionId: string,
  option: QuizOption,
): Promise<ActionResult<QuizAnswerResult>> {
  return runAction(() =>
    authedFetch<QuizAnswerResult>(`/quiz/questions/${questionId}/answers`, {
      method: "POST",
      body: { option },
    }),
  );
}
