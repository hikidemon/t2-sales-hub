/**
 * Scoring rules for quizzes.
 *
 * Pure functions — the scoring must be reproducible and testable, and
 * the same code has to run on the server (to grade an attempt) and in the
 * browser (to show a preview). Keeping it in `core` guarantees that.
 */

import type {
  QuizTest,
  TestAttempt,
  TestQuestion,
  TestStatistics,
  TestWithState,
} from '../domain/quiz.js';

/** Maximum points a test can be worth. */
export function totalPossiblePoints(test: QuizTest): number {
  return test.questions.reduce((sum, question) => sum + question.weight, 0);
}

/** Points a set of answers achieves. */
export function scoreAnswers(questions: TestQuestion[], answers: Record<string, string>): number {
  return questions.reduce((sum, question) => {
    const chosen = answers[question.id];
    if (!chosen) return sum;
    const option = question.options.find((item) => item.id === chosen);
    return option?.isCorrect ? sum + question.weight : sum;
  }, 0);
}

/**
 * Score of an attempt in percent, rounded to one decimal.
 * Returns 0 for a test with no questions rather than NaN.
 */
export function calculateScorePercent(
  questions: TestQuestion[],
  answers: Record<string, string>
): number {
  const possible = questions.reduce((sum, question) => sum + question.weight, 0);
  if (possible <= 0) return 0;

  const scored = scoreAnswers(questions, answers);
  return Math.round((scored / possible) * 1000) / 10;
}

/** Whether an attempt passes the test's scoring policy. */
export function evaluatePass(test: QuizTest, scorePercent: number): boolean {
  if (test.scoring === 'all-correct') {
    return scorePercent >= 100;
  }
  return scorePercent >= test.passThreshold;
}

/** Grades a set of answers into a completed attempt. */
export function gradeAttempt(
  test: QuizTest,
  sellerId: string,
  answers: Record<string, string>,
  startedAtMs: number,
  completedAtMs: number
): TestAttempt {
  const scorePercent = calculateScorePercent(test.questions, answers);

  return {
    id: `attempt-${test.id}-${sellerId}`,
    testId: test.id,
    sellerId,
    answers,
    scorePercent,
    passed: evaluatePass(test, scorePercent),
    completedAt: new Date(completedAtMs).toISOString(),
    durationSeconds: Math.max(Math.round((completedAtMs - startedAtMs) / 1000), 0),
  };
}

/** True when the answer set is complete — every question answered. */
export function isAttemptComplete(test: QuizTest, answers: Record<string, string>): boolean {
  return test.questions.every((question) => Boolean(answers[question.id]));
}

/** Number of questions answered so far. */
export function countAnswered(test: QuizTest, answers: Record<string, string>): number {
  return test.questions.filter((question) => Boolean(answers[question.id])).length;
}

/**
 * Aggregates attempts into the statistics shown to the curator.
 */
export function calculateTestStatistics(
  test: QuizTest,
  attempts: TestAttempt[],
  assignedCount: number
): TestStatistics {
  const completed = attempts.filter((attempt) => attempt.testId === test.id);
  const passed = completed.filter((attempt) => attempt.passed).length;
  const failed = completed.length - passed;

  const averageScorePercent =
    completed.length > 0
      ? Math.round(
          (completed.reduce((sum, attempt) => sum + attempt.scorePercent, 0) / completed.length) *
            10
        ) / 10
      : 0;

  return {
    testId: test.id,
    assigned: assignedCount,
    completed: completed.length,
    passed,
    failed,
    inProgress: Math.max(assignedCount - completed.length, 0),
    averageScorePercent,
  };
}

/**
 * Attaches the seller's state to a test.
 * Used to build the list a seller sees.
 */
export function withSellerState(test: QuizTest, attempt: TestAttempt | null): TestWithState {
  return {
    ...test,
    state: attempt ? (attempt.passed ? 'passed' : 'failed') : 'assigned',
    scorePercent: attempt?.scorePercent ?? null,
    attemptId: attempt?.id ?? null,
  };
}

/**
 * Validates a test before it can be published.
 * Returns the list of problems; an empty list means the test is valid.
 */
export function validateTest(test: QuizTest): string[] {
  const problems: string[] = [];

  if (!test.title.trim()) {
    problems.push('Не указано название теста');
  }
  if (test.questions.length === 0) {
    problems.push('Тест не содержит вопросов');
  }
  if (test.scoring === 'pass-percentage' && (test.passThreshold < 1 || test.passThreshold > 100)) {
    problems.push('Проходной порог должен быть от 1 до 100');
  }

  test.questions.forEach((question, index) => {
    const label = `Вопрос ${index + 1}`;
    if (!question.prompt.trim()) {
      problems.push(`${label}: не сформулирован текст вопроса`);
    }
    if (question.options.length < 2) {
      problems.push(`${label}: должно быть не менее двух вариантов ответа`);
    }
    if (!question.options.some((option) => option.isCorrect)) {
      problems.push(`${label}: не отмечен правильный ответ`);
    }
    if (question.weight <= 0) {
      problems.push(`${label}: вес вопроса должен быть больше нуля`);
    }
  });

  return problems;
}
