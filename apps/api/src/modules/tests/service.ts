/**
 * Quiz service.
 *
 * Two roles share the service:
 *   - a **curator** creates, edits, publishes and reviews tests;
 *   - a **seller** sees the tests assigned to them and takes them.
 *
 * The service owns the tests, the attempts and the assignments. Grading
 * is delegated to the pure functions in `@t2-sales-hub/core` so the same
 * rules run on the server and in the browser preview.
 */

import {
  calculateTestStatistics,
  gradeAttempt,
  validateTest,
  withSellerState,
  type QuizTest,
  type TestAssignment,
  type TestAttempt,
  type TestWithState,
} from '@t2-sales-hub/core';

export interface QuizService {
  listTests(): QuizTest[];
  getTest(id: string): QuizTest | null;
  createTest(input: Omit<QuizTest, 'id' | 'createdAt' | 'publishedAt'>): QuizTest;
  updateTest(id: string, input: Partial<QuizTest>): QuizTest | null;
  publishTest(id: string): QuizTest | null;
  archiveTest(id: string): QuizTest | null;
  listForSeller(sellerId: string): TestWithState[];
  getAssignment(sellerId: string, testId: string): TestAssignment | null;
  startAttempt(sellerId: string, testId: string): TestAssignment | null;
  submitAttempt(
    sellerId: string,
    testId: string,
    answers: Record<string, string>,
    startedAtMs: number
  ): TestAttempt | null;
  statistics(testId: string, assignedCount: number): ReturnType<typeof calculateTestStatistics>;
}

export class InMemoryQuizService implements QuizService {
  private tests: QuizTest[];
  private attempts: TestAttempt[];
  private assignments: TestAssignment[];
  private counter = 0;

  constructor(
    tests: QuizTest[] = [],
    attempts: TestAttempt[] = [],
    assignments: TestAssignment[] = []
  ) {
    this.tests = [...tests];
    this.attempts = [...attempts];
    this.assignments = [...assignments];
  }

  listTests(): QuizTest[] {
    return [...this.tests];
  }

  getTest(id: string): QuizTest | null {
    return this.tests.find((test) => test.id === id) ?? null;
  }

  createTest(input: Omit<QuizTest, 'id' | 'createdAt' | 'publishedAt'>): QuizTest {
    this.counter += 1;
    const test: QuizTest = {
      ...input,
      id: `quiz-${this.counter}`,
      createdAt: new Date().toISOString(),
      publishedAt: null,
    };
    this.tests.unshift(test);
    return test;
  }

  updateTest(id: string, input: Partial<QuizTest>): QuizTest | null {
    const index = this.tests.findIndex((test) => test.id === id);
    if (index < 0) return null;

    const current = this.tests[index] as QuizTest;
    const updated: QuizTest = { ...current, ...input, id: current.id };
    this.tests[index] = updated;
    return updated;
  }

  publishTest(id: string): QuizTest | null {
    const test = this.getTest(id);
    if (!test) return null;

    const problems = validateTest(test);
    if (problems.length > 0) {
      throw new Error(`Тест нельзя опубликовать: ${problems.join('; ')}`);
    }

    return this.updateTest(id, {
      status: 'published',
      publishedAt: new Date().toISOString(),
    });
  }

  archiveTest(id: string): QuizTest | null {
    return this.updateTest(id, { status: 'archived' });
  }

  listForSeller(sellerId: string): TestWithState[] {
    const sellerAssignments = this.assignments.filter(
      (assignment) => assignment.sellerId === sellerId
    );

    return sellerAssignments
      .map((assignment) => {
        const test = this.getTest(assignment.testId);
        if (!test) return null;
        const attempt = assignment.attemptId
          ? (this.attempts.find((item) => item.id === assignment.attemptId) ?? null)
          : null;
        return withSellerState(test, attempt);
      })
      .filter((item): item is TestWithState => item !== null)
      .sort((a, b) => {
        // Assigned tests first — they still need action.
        const order = { assigned: 0, 'in-progress': 1, failed: 2, passed: 3 };
        return order[a.state] - order[b.state];
      });
  }

  getAssignment(sellerId: string, testId: string): TestAssignment | null {
    return (
      this.assignments.find(
        (assignment) => assignment.sellerId === sellerId && assignment.testId === testId
      ) ?? null
    );
  }

  startAttempt(sellerId: string, testId: string): TestAssignment | null {
    const assignment = this.getAssignment(sellerId, testId);
    if (!assignment) return null;
    if (assignment.state === 'passed') return assignment;

    return this.updateAssignment(assignment, { state: 'in-progress' });
  }

  submitAttempt(
    sellerId: string,
    testId: string,
    answers: Record<string, string>,
    startedAtMs: number
  ): TestAttempt | null {
    const test = this.getTest(testId);
    if (!test) return null;
    if (test.status !== 'published') return null;

    const attempt = gradeAttempt(test, sellerId, answers, startedAtMs, Date.now());

    const index = this.attempts.findIndex((item) => item.id === attempt.id);
    if (index >= 0) {
      this.attempts[index] = attempt;
    } else {
      this.attempts.push(attempt);
    }

    const assignment = this.getAssignment(sellerId, testId);
    if (assignment) {
      this.updateAssignment(assignment, {
        state: attempt.passed ? 'passed' : 'failed',
        attemptId: attempt.id,
        scorePercent: attempt.scorePercent,
      });
    }

    return attempt;
  }

  statistics(testId: string, assignedCount: number): ReturnType<typeof calculateTestStatistics> {
    const test = this.getTest(testId);
    if (!test) {
      return {
        testId,
        assigned: 0,
        completed: 0,
        passed: 0,
        failed: 0,
        inProgress: 0,
        averageScorePercent: 0,
      };
    }
    return calculateTestStatistics(test, this.attempts, assignedCount);
  }

  private updateAssignment(
    assignment: TestAssignment,
    patch: Partial<TestAssignment>
  ): TestAssignment {
    const index = this.assignments.findIndex(
      (item) => item.sellerId === assignment.sellerId && item.testId === assignment.testId
    );
    const updated = { ...assignment, ...patch };
    if (index >= 0) {
      this.assignments[index] = updated;
    }
    return updated;
  }
}
