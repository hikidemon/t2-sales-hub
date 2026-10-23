/**
 * Ranking widget — answers «как я выгляжу относительно коллег?».
 */

import { formatCurrency, formatPercent, type RankingPosition } from '@t2-sales-hub/core';
import { Badge, Card, CardContent, Icon } from '@t2-sales-hub/ui';

export function RankingWidget({ ranking }: { ranking: RankingPosition }) {
  const isTopThree = ranking.position <= 3;

  return (
    <Card variant="glass" className="flex flex-col">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base">Позиция в рейтинге</h3>
          <Badge variant={isTopThree ? 'lime' : 'brand'} size="sm">
            {isTopThree ? 'топ-3' : `место ${ranking.position}`}
          </Badge>
        </div>

        <div className="flex items-end gap-3">
          <span className="flex items-center gap-2 font-display text-4xl tracking-tight">
            <Icon name="trophy" size="lg" className="text-brand-500" />
            <span className="tabular-nums">#{ranking.position}</span>
          </span>
          <span className="pb-1.5 text-sm text-text-tertiary">из {ranking.total} продавцов</span>
        </div>

        <p className="text-xs leading-relaxed text-text-secondary">
          Вы опережаете{' '}
          <span className="font-semibold text-text-primary tabular-nums">
            {formatPercent(ranking.beatsPercent)}
          </span>{' '}
          коллег по демо-данным за период.
        </p>

        <ul className="flex flex-col gap-1 border-t border-border-secondary pt-3">
          {ranking.top.map((entry) => (
            <li
              key={entry.position}
              className={
                entry.isCurrentSeller
                  ? 'flex items-center gap-3 rounded-lg bg-brand-500/10 px-2.5 py-2'
                  : 'flex items-center gap-3 px-2.5 py-2'
              }
            >
              <span className="w-5 shrink-0 text-xs font-semibold text-text-tertiary tabular-nums">
                {entry.position}
              </span>
              <span
                className={
                  entry.isCurrentSeller
                    ? 'min-w-0 flex-1 truncate text-sm font-semibold text-brand-600'
                    : 'min-w-0 flex-1 truncate text-sm text-text-secondary'
                }
              >
                {entry.sellerName}
                {entry.isCurrentSeller && ' (вы)'}
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {formatCurrency(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
