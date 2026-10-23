/**
 * Motivation widget — answers «что мне нужно улучшить, чтобы увеличить доход?».
 *
 * The advice is derived from the demo dataset only. It is not an
 * official T2 motivation rule and must not be presented as one.
 */

import { formatCurrency, type PlanProgress } from '@t2-sales-hub/core';
import { Card, CardContent, Icon } from '@t2-sales-hub/ui';

export interface MotivationWidgetProps {
  plan: PlanProgress;
  remainingDays: number;
}

export function MotivationWidget({ plan, remainingDays }: MotivationWidgetProps) {
  const dailyTarget =
    remainingDays > 0 ? Math.ceil(plan.remaining / remainingDays) : plan.remaining;

  return (
    <Card variant="neo" className="border-lime-500">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-500/25 text-ink-900">
            <Icon name="sparkles" size="sm" />
          </span>
          <h3 className="font-display text-base">Ближайшая достижимая цель</h3>
        </div>

        <p className="text-sm leading-relaxed text-text-secondary">
          До выполнения плана осталось{' '}
          <span className="font-semibold text-text-primary tabular-nums">
            {formatCurrency(plan.remaining)}
          </span>
          . При текущем темпе это{' '}
          <span className="font-semibold text-text-primary tabular-nums">
            {formatCurrency(dailyTarget)}
          </span>{' '}
          в день — демо-расчёт, разделённый на оставшиеся дни.
        </p>

        <p className="text-[0.6875rem] leading-relaxed text-text-muted">
          Совет сформирован по демо-правилам и не является официальной формулой мотивации T2.
        </p>
      </CardContent>
    </Card>
  );
}
