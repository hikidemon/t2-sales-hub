/**
 * Forecast widget — answers «сколько я потенциально заработаю до конца месяца?».
 */

import { formatCurrency, type Forecast } from '@t2-sales-hub/core';
import { Badge, Card, CardContent, Icon } from '@t2-sales-hub/ui';

const CONFIDENCE_LABEL: Record<Forecast['confidence'], string> = {
  high: 'высокая',
  medium: 'средняя',
  low: 'низкая',
};

const CONFIDENCE_VARIANT: Record<Forecast['confidence'], 'success' | 'warning' | 'danger'> = {
  high: 'success',
  medium: 'warning',
  low: 'danger',
};

export function ForecastWidget({ forecast }: { forecast: Forecast }) {
  return (
    <Card variant="glass" className="flex flex-col">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base">Прогноз до конца периода</h3>
          <Badge variant={CONFIDENCE_VARIANT[forecast.confidence]} size="sm" dot>
            точность: {CONFIDENCE_LABEL[forecast.confidence]}
          </Badge>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-tertiary">Ожидаемый итог</span>
          <span className="font-display text-3xl tracking-tight tabular-nums">
            {formatCurrency(forecast.expectedTotal)}
          </span>
          <span className="flex items-center gap-1 text-sm font-medium text-success-600">
            <Icon name="trending-up" size="sm" />+{formatCurrency(forecast.expectedAdditional)} за
            оставшиеся дни
          </span>
        </div>

        <p className="mt-auto rounded-xl bg-background-tertiary/60 px-3 py-2 text-[0.6875rem] leading-relaxed text-text-tertiary">
          {forecast.basis}
        </p>
      </CardContent>
    </Card>
  );
}
