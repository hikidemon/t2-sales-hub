/**
 * Dynamics chart — answers «как я двигаюсь в течение периода?».
 */

import { formatCurrencyCompact, type MetricDynamics } from '@t2-sales-hub/core';
import { Card, CardContent, LineChart } from '@t2-sales-hub/ui';

export interface DynamicsChartWidgetProps {
  dynamics: MetricDynamics;
  /** Reference line, e.g. the average daily income. */
  referenceValue?: number;
  referenceLabel?: string;
}

export function DynamicsChartWidget({
  dynamics,
  referenceValue,
  referenceLabel,
}: DynamicsChartWidgetProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-semibold">{dynamics.title}</h3>
            <p className="text-xs text-text-tertiary">
              Наведите курсор на график, чтобы увидеть значение за день
            </p>
          </div>
          <span className="text-xs text-text-muted">демо-данные</span>
        </div>

        <LineChart
          data={dynamics.points}
          title={dynamics.title}
          height={200}
          formatValue={formatCurrencyCompact}
          referenceValue={referenceValue}
          referenceLabel={referenceLabel}
        />
      </CardContent>
    </Card>
  );
}
