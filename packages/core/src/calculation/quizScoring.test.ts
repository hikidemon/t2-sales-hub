import { describe, expect, it } from 'vitest';

import {
  calculateScorePercent,
  calculateTestStatistics,
  countAnswered,
  evaluatePass,
  gradeAttempt,
  isAttemptComplete,
  scoreAnswers,
  totalPossiblePoints,
  validateTest,
  withSellerState,
} from './quizScoring.js';
import type { QuizTest } from '../domain/quiz.js';

const TEST: QuizTest = {
  id: 'quiz-1',
  title: 'Тест',
  description: '',
  status: 'published',
  passThreshold: 80,
  scoring: 'pass-percentage',
  durationMinutes: 15,
  createdAt: '2026-10-01T00:00:00.000Z',
  publishedAt: '2026-10-02T00:00:00.000Z',
  authorName: 'Куратор',
  dueAt: null,
  assigneeIds: [],
  questions: [
    {
      id: 'q1',
      prompt: 'Первый вопрос',
      weight: 2,
      options: [
        { id: 'a', text: 'Неверно', isCorrect: false },
        { id: 'b', text: 'Верно', isCorrect: true },
      ],
    },
    {
      id: 'q2',
      prompt: 'Второй вопрос',
      weight: 1,
      options: [
        { id: 'c', text: 'Верно', isCorrect: true },
        { id: 'd', text: 'Неверно', isCorrect: false },
      ],
    },
  ],
};

describe('scoreAnswers', () => {
  it('adds the weight of every correct answer', () => {
    expect(scoreAnswers(TEST.questions, { q1: 'b', q2: 'c' })).toBe(3);
  });

  it('ignores wrong and missing answers', () => {
    expect(scoreAnswers(TEST.questions, { q1: 'a' })).toBe(0);
    expect(scoreAnswers(TEST.questions, {})).toBe(0);
  });
});

describe('calculateScorePercent', () => {
  it('weights the questions, not the count', () => {
    // One of three points is correct.
    expect(calculateScorePercent(TEST.questions, { q1: 'b' })).toBeCloseTo(66.7, 1);
  });

  it('returns 100 for a fully correct answer set', () => {
    expect(calculateScorePercent(TEST.questions, { q1: 'b', q2: 'c' })).toBe(100);
  });

  it('returns 0 rather than NaN for a test without points', () => {
    expect(calculateScorePercent([], {})).toBe(0);
  });
});

describe('evaluatePass', () => {
  it('compares against the threshold for a percentage policy', () => {
    expect(evaluatePass(TEST, 80)).toBe(true);
    expect(evaluatePass(TEST, 79.9)).toBe(false);
  });

  it('requires every point for the all-correct policy', () => {
    const strict: QuizTest = { ...TEST, scoring: 'all-correct' };
    expect(evaluatePass(strict, 100)).toBe(true);
    expect(evaluatePass(strict, 99.9)).toBe(false);
  });
});

describe('gradeAttempt', () => {
  it('produces a passed attempt', () => {
    const attempt = gradeAttempt(TEST, 'EMP-001', { q1: 'b', q2: 'c' }, 1_000_000, 1_060_000);

    expect(attempt.scorePercent).toBe(100);
    expect(attempt.passed).toBe(true);
    expect(attempt.durationSeconds).toBe(60);
    expect(attempt.sellerId).toBe('EMP-001');
  });

  it('produces a failed attempt', () => {
    const attempt = gradeAttempt(TEST, 'EMP-001', { q1: 'a', q2: 'c' }, 0, 0);
    expect(attempt.passed).toBe(false);
    expect(attempt.scorePercent).toBeCloseTo(33.3, 1);
  });
});

describe('isAttemptComplete and countAnswered', () => {
  it('requires every question to be answered', () => {
    expect(isAttemptComplete(TEST, { q1: 'b' })).toBe(false);
    expect(isAttemptComplete(TEST, { q1: 'b', q2: 'c' })).toBe(true);
  });

  it('counts the answered questions', () => {
    expect(countAnswered(TEST, { q1: 'b' })).toBe(1);
    expect(countAnswered(TEST, {})).toBe(0);
  });
});

describe('calculateTestStatistics', () => {
  it('aggregates the attempts', () => {
    const attempts = [
      {
        id: 'a1',
        testId: 'quiz-1',
        sellerId: 'EMP-001',
        answers: {},
        scorePercent: 100,
        passed: true,
        completedAt: '2026-10-10T00:00:00.000Z',
        durationSeconds: 30,
      },
      {
        id: 'a2',
        testId: 'quiz-1',
        sellerId: 'EMP-002',
        answers: {},
        scorePercent: 50,
        passed: false,
        completedAt: '2026-10-11T00:00:00.000Z',
        durationSeconds: 40,
      },
    ];

    const stats = calculateTestStatistics(TEST, attempts, 10);

    expect(stats.assigned).toBe(10);
    expect(stats.completed).toBe(2);
    expect(stats.passed).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.inProgress).toBe(8);
    expect(stats.averageScorePercent).toBe(75);
  });

  it('handles a test without attempts', () => {
    const stats = calculateTestStatistics(TEST, [], 0);
    expect(stats.averageScorePercent).toBe(0);
    expect(stats.completed).toBe(0);
  });
});

describe('withSellerState', () => {
  it('reports the assigned state without an attempt', () => {
    const result = withSellerState(TEST, null);
    expect(result.state).toBe('assigned');
    expect(result.scorePercent).toBeNull();
  });

  it('reports the passed state with an attempt', () => {
    const result = withSellerState(TEST, {
      id: 'a1',
      testId: 'quiz-1',
      sellerId: 'EMP-001',
      answers: {},
      scorePercent: 100,
      passed: true,
      completedAt: '2026-10-10T00:00:00.000Z',
      durationSeconds: 30,
    });

    expect(result.state).toBe('passed');
    expect(result.scorePercent).toBe(100);
  });
});

describe('validateTest', () => {
  it('accepts a valid test', () => {
    expect(validateTest(TEST)).toEqual([]);
  });

  it('reports a test without questions', () => {
    const problems = validateTest({ ...TEST, questions: [] });
    expect(problems).toContain('Тест не содержит вопросов');
  });

  it('reports a question without a correct answer', () => {
    const broken: QuizTest = {
      ...TEST,
      questions: [
        {
          id: 'q1',
          prompt: 'Вопрос',
          weight: 1,
          options: [
            { id: 'a', text: 'A', isCorrect: false },
            { id: 'b', text: 'B', isCorrect: false },
          ],
        },
      ],
    };
    expect(validateTest(broken)).toContain('Вопрос 1: не отмечен правильный ответ');
  });

  it('reports a question with a single option', () => {
    const broken: QuizTest = {
      ...TEST,
      questions: [
        {
          id: 'q1',
          prompt: 'Вопрос',
          weight: 1,
          options: [{ id: 'a', text: 'A', isCorrect: true }],
        },
      ],
    };
    expect(validateTest(broken)).toContain('Вопрос 1: должно быть не менее двух вариантов ответа');
  });

  it('reports an out-of-range threshold', () => {
    expect(validateTest({ ...TEST, passThreshold: 0 })).toContain(
      'Проходной порог должен быть от 1 до 100'
    );
  });
});

describe('totalPossiblePoints', () => {
  it('sums the question weights', () => {
    expect(totalPossiblePoints(TEST)).toBe(3);
  });
});
