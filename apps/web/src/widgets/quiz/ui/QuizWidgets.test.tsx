import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import type { TestWithState } from '@t2-sales-hub/core';
import { QuizListWidget, QuizRunnerWidget } from './QuizWidgets';

const TEST: TestWithState = {
  id: 'quiz-1',
  title: 'Новые модели',
  description: 'Проверка новинок ассортимента',
  status: 'published',
  passThreshold: 80,
  scoring: 'pass-percentage',
  durationMinutes: 20,
  createdAt: '2026-10-18T10:00:00.000Z',
  publishedAt: '2026-10-19T08:00:00.000Z',
  authorName: 'Куратор',
  dueAt: '2026-11-28T21:00:00.000Z',
  assigneeIds: [],
  state: 'assigned',
  scorePercent: null,
  attemptId: null,
  questions: [
    {
      id: 'q1',
      prompt: 'Первый вопрос',
      weight: 1,
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

describe('QuizListWidget', () => {
  it('renders the test with its metadata', () => {
    render(<QuizListWidget tests={[TEST]} onTake={vi.fn()} />);

    expect(screen.getByText('Новые модели')).toBeInTheDocument();
    expect(screen.getByText('назначен')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('80 %')).toBeInTheDocument();
  });

  it('calls onTake when the test is started', () => {
    const onTake = vi.fn();
    render(<QuizListWidget tests={[TEST]} onTake={onTake} />);

    fireEvent.click(screen.getByRole('button', { name: /Пройти тест/ }));

    expect(onTake).toHaveBeenCalledWith(TEST);
  });

  it('shows an empty state without tests', () => {
    render(<QuizListWidget tests={[]} onTake={vi.fn()} />);
    expect(screen.getByText('Тестов пока нет')).toBeInTheDocument();
  });
});

describe('QuizRunnerWidget', () => {
  it('shows the first question and moves to the next', () => {
    render(<QuizRunnerWidget test={TEST} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('Первый вопрос')).toBeInTheDocument();
    expect(screen.getByText(/Вопрос 1 из 2/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Верно' }));
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }));

    expect(screen.getByText('Второй вопрос')).toBeInTheDocument();
  });

  it('submits the answers once every question is answered', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<QuizRunnerWidget test={TEST} onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Верно' }));
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Верно' }));
    fireEvent.click(screen.getByRole('button', { name: /Завершить/ }));

    expect(onSubmit).toHaveBeenCalledWith({ q1: 'b', q2: 'c' });
  });

  it('closes on demand', () => {
    const onClose = vi.fn();
    render(<QuizRunnerWidget test={TEST} onSubmit={vi.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /Выйти/ }));
    expect(onClose).toHaveBeenCalled();
  });
});
