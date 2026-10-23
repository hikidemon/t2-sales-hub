/**
 * Recent operations widget — the activity feed.
 */

import { formatCurrency, type SalesOperation } from '@t2-sales-hub/core';
import { Card, CardContent, Icon, type IconName } from '@t2-sales-hub/ui';

export interface RecentOperationsWidgetProps {
  operations: SalesOperation[];
}

const OPERATION_ICONS: Record<SalesOperation['type'], IconName> = {
  sale: 'wallet',
  bonus: 'award',
  correction: 'info',
};

const OPERATION_LABELS: Record<SalesOperation['type'], string> = {
  sale: 'Продажа',
  bonus: 'Бонус',
  correction: 'Корректировка',
};

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function RecentOperationsWidget({ operations }: RecentOperationsWidgetProps) {
  if (operations.length === 0) {
    return (
      <Card variant="glass">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background-tertiary text-text-tertiary">
            <Icon name="inbox" size="lg" />
          </span>
          <p className="text-sm font-semibold">Операций за период нет</p>
          <p className="text-xs text-text-tertiary">
            Демо-источник не содержит операций для выбранного периода.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card padding="none" variant="default">
      <CardContent className="flex flex-col gap-3 p-5 pb-2">
        <h3 className="font-display text-base">Последние операции</h3>
      </CardContent>
      <ul className="divide-y divide-border-secondary">
        {operations.map((operation) => (
          <li key={operation.id} className="flex items-center gap-3 px-4 py-3 md:px-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background-tertiary text-text-tertiary">
              <Icon name={OPERATION_ICONS[operation.type]} size="sm" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{operation.title}</p>
              <p className="text-xs text-text-tertiary">
                {OPERATION_LABELS[operation.type]} · {formatDate(operation.date)}
              </p>
            </div>
            <span
              className={
                operation.amount < 0
                  ? 'shrink-0 text-sm font-semibold tabular-nums text-danger-600'
                  : 'shrink-0 text-sm font-semibold tabular-nums'
              }
            >
              {formatCurrency(operation.amount)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
