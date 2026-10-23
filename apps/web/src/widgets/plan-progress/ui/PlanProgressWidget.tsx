/**
 * Plan progress widget — answers «какой у меня прогресс по плану?».
 */

import { formatCurrency, formatPercent, type PlanProgress } from '@t2-sales-hub/core';
import { Card, CardContent, Progress } from '@t2-sales-hub/ui';

export interface PlanProgressWidgetProps {
  plan: PlanProgress;
  /** Days already elapsed in the period — used for the time reference. */
  elapsedDays: number;
  totalDays: number;
}

export function PlanProgressWidget({ plan, elapsedDays, totalDays }: PlanProgressWidgetProps) {
  const timeProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
  const isAhead = plan.percent >= timeProgress;

  return (
    <Card variant="default" className="flex flex-col">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-display text-base">Выполнение плана</h3>
            <p className="text-xs text-text-tertiary">
              Демо-метрика: доход к целевому плану периода
            </p>
          </div>
          <span className="font-display text-3xl tracking-tight tabular-nums">
            {formatPercent(plan.percent)}
          </span>
        </div>

        <Progress value={plan.percent} variant="brand" size="lg" />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-text-tertiary">
            Заработано{' '}
            <span className="font-medium text-text-primary tabular-nums">
              {formatCurrency(plan.current)}
            </span>{' '}
            из {formatCurrency(plan.target)}
          </span>
          <span
            className={
              isAhead
                ? 'font-medium text-success-600 tabular-nums'
                : 'font-medium text-warning-600 tabular-nums'
            }
          >
            {isAhead ? 'опережаете график' : 'отстаёте от графика'} · время{' '}
            {formatPercent(timeProgress, 0)}
          </span>
        </div>

        {plan.remaining > 0 && (
          <p className="mt-auto rounded-xl bg-background-tertiary/60 px-3 py-2 text-xs text-text-secondary">
            До выполнения плана осталось{' '}
            <span className="font-semibold text-text-primary tabular-nums">
              {formatCurrency(plan.remaining)}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
