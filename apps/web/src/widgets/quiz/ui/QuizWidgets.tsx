/**
 * Quiz widget — the list of tests assigned to the seller and the
 * runner used to take one.
 */

import { useState } from 'react';

import { countAnswered, type TestWithState } from '@t2-sales-hub/core';
import { Badge, Button, Card, CardContent, Icon, Progress } from '@t2-sales-hub/ui';

export interface QuizListWidgetProps {
  tests: TestWithState[];
  onTake: (test: TestWithState) => void;
}

const STATE_LABEL: Record<TestWithState['state'], string> = {
  assigned: 'назначен',
  'in-progress': 'в процессе',
  passed: 'пройден',
  failed: 'не пройден',
};

const STATE_VARIANT: Record<TestWithState['state'], 'default' | 'success' | 'warning' | 'danger'> =
  {
    assigned: 'default',
    'in-progress': 'warning',
    passed: 'success',
    failed: 'danger',
  };

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function QuizListWidget({ tests, onTake }: QuizListWidgetProps) {
  if (tests.length === 0) {
    return (
      <Card variant="glass">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/15 text-ink-900">
            <Icon name="graduation" size="lg" />
          </span>
          <p className="text-sm font-semibold">Тестов пока нет</p>
          <p className="max-w-xs text-xs leading-relaxed text-text-tertiary">
            Когда куратор назначит вам тест, он появится здесь.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {tests.map((test) => {
        const due = formatDueDate(test.dueAt);
        const isActionable = test.state === 'assigned' || test.state === 'in-progress';

        return (
          <Card key={test.id} variant={isActionable ? 'neo' : 'default'} className="flex flex-col">
            <CardContent className="flex h-full flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-base text-text-primary">{test.title}</h3>
                <Badge variant={STATE_VARIANT[test.state]} size="sm">
                  {STATE_LABEL[test.state]}
                </Badge>
              </div>

              <p className="text-sm leading-relaxed text-text-tertiary">{test.description}</p>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-text-muted">Вопросов</dt>
                  <dd className="font-semibold tabular-nums text-text-primary">
                    {test.questions.length}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-text-muted">Проходной порог</dt>
                  <dd className="font-semibold tabular-nums text-text-primary">
                    {test.passThreshold} %
                  </dd>
                </div>
                {test.durationMinutes > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-text-muted">Время</dt>
                    <dd className="font-semibold tabular-nums text-text-primary">
                      {test.durationMinutes} мин
                    </dd>
                  </div>
                )}
                {due && (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-text-muted">Срок</dt>
                    <dd className="font-semibold text-text-primary">{due}</dd>
                  </div>
                )}
              </dl>

              {test.scorePercent !== null && (
                <Progress
                  value={test.scorePercent}
                  variant={test.state === 'passed' ? 'success' : 'danger'}
                  size="sm"
                  showLabel
                  label="Результат"
                />
              )}

              <div className="mt-auto pt-1">
                {isActionable ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onTake(test)}
                    className="w-full"
                  >
                    <Icon name="play" size="sm" className="mr-1" />
                    {test.state === 'in-progress' ? 'Продолжить' : 'Пройти тест'}
                  </Button>
                ) : (
                  <p className="text-xs text-text-tertiary">
                    {test.state === 'passed'
                      ? `Результат: ${test.scorePercent} %`
                      : `Результат: ${test.scorePercent} % — попробуйте ещё раз`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export interface QuizRunnerWidgetProps {
  test: TestWithState;
  onSubmit: (answers: Record<string, string>) => Promise<void>;
  onClose: () => void;
}

/**
 * The runner: one question at a time, with the progress shown above.
 */
export function QuizRunnerWidget({ test, onSubmit, onClose }: QuizRunnerWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = test.questions[currentIndex];
  const answered = countAnswered(test, answers);
  const isLast = currentIndex === test.questions.length - 1;

  if (!question) {
    return null;
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(answers);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="glass" className="overflow-hidden">
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg text-text-primary">{test.title}</h2>
            <p className="text-xs text-text-tertiary">
              Вопрос {currentIndex + 1} из {test.questions.length}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <Icon name="close" size="sm" className="mr-1" />
            Выйти
          </Button>
        </div>

        <Progress value={answered} max={test.questions.length} variant="brand" size="sm" />

        <fieldset className="flex flex-col gap-3">
          <legend className="text-base font-medium leading-relaxed text-text-primary">
            {question.prompt}
          </legend>

          {question.options.map((option) => {
            const isSelected = answers[question.id] === option.id;

            return (
              <label
                key={option.id}
                className={
                  isSelected
                    ? 'flex cursor-pointer items-start gap-3 rounded-xl border-2 border-brand-500 bg-brand-500/10 p-3 transition-colors'
                    : 'flex cursor-pointer items-start gap-3 rounded-xl border border-border-secondary p-3 transition-colors hover:border-border-primary hover:bg-background-tertiary'
                }
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={isSelected}
                  onChange={() =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: option.id,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
                />
                <span className="text-sm leading-relaxed text-text-primary">{option.text}</span>
              </label>
            );
          })}
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="md"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
          >
            Назад
          </Button>

          {isLast ? (
            <Button
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={answered < test.questions.length}
              onClick={() => void handleSubmit()}
            >
              Завершить и отправить
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              disabled={!answers[question.id]}
              onClick={() => setCurrentIndex((index) => index + 1)}
            >
              Далее
            </Button>
          )}
        </div>

        {answered < test.questions.length && (
          <p className="text-xs text-text-tertiary">
            Отвечено {answered} из {test.questions.length}. Ответьте на все вопросы, чтобы отправить
            тест.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
