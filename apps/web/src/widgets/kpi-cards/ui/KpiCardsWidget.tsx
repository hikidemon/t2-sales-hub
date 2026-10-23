/**
 * KPI cards — the neutral demo indicators row.
 *
 * The cards alternate between a plain surface and a glass surface so the
 * row does not read as a set of identical rectangles.
 */

import {
  formatCurrency,
  formatDelta,
  formatNumber,
  formatPercent,
  type Kpi,
} from '@t2-sales-hub/core';
import { Card, CardContent, Icon, type IconName } from '@t2-sales-hub/ui';

const KPI_ICONS: Record<string, IconName> = {
  'bonus-share': 'percent',
  'plan-progress': 'target',
  'income-delta': 'trending-up',
  'operations-count': 'list',
};

function formatKpiValue(kpi: Kpi): string {
  switch (kpi.unit) {
    case 'currency':
      return formatCurrency(kpi.value);
    case 'percent':
      return formatPercent(kpi.value);
    case 'number':
      return formatNumber(kpi.value);
  }
}

export function KpiCardsWidget({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi, index) => {
        const isDelta = kpi.id === 'income-delta';
        const delta = isDelta ? kpi.value : undefined;
        const positive = delta !== undefined && delta >= 0;
        const isGlass = index % 2 === 1;

        return (
          <Card
            key={kpi.id}
            variant={isGlass ? 'glass' : 'default'}
            hoverable
            className="flex flex-col"
          >
            <CardContent className="flex h-full flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-text-tertiary">{kpi.label}</span>
                <span
                  className={
                    isGlass
                      ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lime-500/20 text-ink-900'
                      : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600'
                  }
                >
                  <Icon name={KPI_ICONS[kpi.id] ?? 'chart'} size="sm" />
                </span>
              </div>

              <p className="font-display text-2xl tracking-tight tabular-nums">
                {formatKpiValue(kpi)}
              </p>

              {delta !== undefined ? (
                <span
                  className={
                    positive
                      ? 'flex items-center gap-1 text-xs font-medium text-success-600'
                      : 'flex items-center gap-1 text-xs font-medium text-danger-600'
                  }
                >
                  <Icon name={positive ? 'trending-up' : 'trending-down'} size="sm" />
                  {formatDelta(delta)} к прошлому периоду
                </span>
              ) : (
                <span className="text-[0.6875rem] leading-snug text-text-muted">{kpi.hint}</span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
