/**
 * Test (quiz) domain model.
 *
 * A curator creates tests that sellers must pass — for example, a product
 * knowledge check before a new model goes on sale, or a re-certification
 * after the motivation rules change.
 *
 * Framework-independent — no React, no transport.
 */

/** The state of a test in its lifecycle. */
export type TestStatus = 'draft' | 'published' | 'archived';

/** How a test is scored. */
export type ScoringPolicy = 'pass-percentage' | 'all-correct';

/** A single answer option. */
export interface TestOption {
  id: string;
  text: string;
  /** True for the correct option. */
  isCorrect: boolean;
}

/** A single question. */
export interface TestQuestion {
  id: string;
  /** The question text shown to the seller. */
  prompt: string;
  options: TestOption[];
  /** Optional explanation revealed after answering. */
  explanation?: string;
  /** Points awarded for a correct answer. */
  weight: number;
}

/** A test created by a curator. */
export interface QuizTest {
  id: string;
  title: string;
  /** What the test is about — shown in the list. */
  description: string;
  status: TestStatus;
  questions: TestQuestion[];
  /** Pass threshold in percent, used with `pass-percentage`. */
  passThreshold: number;
  scoring: ScoringPolicy;
  /** Time limit in minutes; zero means no limit. */
  durationMinutes: number;
  /** ISO timestamp of creation. */
  createdAt: string;
  /** ISO timestamp of publication; null while the test is a draft. */
  publishedAt: string | null;
  /** Who created the test — curator display name. */
  authorName: string;
  /** Optional deadline for completion. */
  dueAt: string | null;
  /** Which employees the test is assigned to; empty means everyone. */
  assigneeIds: string[];
}

/** A seller's attempt at a test. */
export interface TestAttempt {
  id: string;
  testId: string;
  sellerId: string;
  /** Answers keyed by question id → chosen option id. */
  answers: Record<string, string>;
  /** Percent of the achievable points that were scored. */
  scorePercent: number;
  passed: boolean;
  /** ISO timestamp of the attempt. */
  completedAt: string;
  /** Total time spent, in seconds. */
  durationSeconds: number;
}

/** The result of a test for one seller. */
export interface TestAssignment {
  testId: string;
  sellerId: string;
  /** Not started, in progress, passed or failed. */
  state: 'assigned' | 'in-progress' | 'passed' | 'failed';
  attemptId: string | null;
  scorePercent: number | null;
  dueAt: string | null;
}

/** A test with the current seller's state attached. */
export interface TestWithState extends QuizTest {
  state: TestAssignment['state'];
  scorePercent: number | null;
  attemptId: string | null;
}

/** Aggregate statistics for the curator dashboard. */
export interface TestStatistics {
  testId: string;
  assigned: number;
  completed: number;
  passed: number;
  failed: number;
  inProgress: number;
  /** Average score of the completed attempts, in percent. */
  averageScorePercent: number;
}
