/**
 * Income widget — the headline block answering «сколько я заработал?»
 * plus the breakdown of the income composition.
 *
 * The headline is a neo-style bento block: a hard-edged accent tile that
 * reads as a cut-out rather than a floating card.
 */

import { formatCurrency, type IncomeSummary } from '@t2-sales-hub/core';
import { Badge, Card, CardContent, Icon } from '@t2-sales-hub/ui';

export interface IncomeWidgetProps {
  income: IncomeSummary;
  periodLabel: string;
}

export function IncomeWidget({ income, periodLabel }: IncomeWidgetProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Headline — a neo block with the brand magenta edge */}
      <div className="neo-block-brand relative overflow-hidden rounded-2xl bg-ink-900 p-5 md:p-6 lg:col-span-2">
        <span
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-500/25 blur-2xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-white/70">
              Общий заработок за {periodLabel.toLowerCase()}
            </span>
            <span className="font-display text-4xl tracking-tight text-white tabular-nums md:text-5xl">
              {formatCurrency(income.total)}
            </span>
          </div>
          <Badge variant="lime" size="sm">
            демо-данные
          </Badge>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-3 border-t border-white/15 pt-4 sm:grid-cols-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-white/60">Базовая часть</span>
            <span className="text-lg font-semibold text-white tabular-nums">
              {formatCurrency(income.base)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-white/60">Бонусы начислены</span>
            <span className="text-lg font-semibold text-white tabular-nums">
              {formatCurrency(income.earnedBonusTotal)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-white/60">Ожидается к выплате</span>
            <span className="text-lg font-semibold text-white/90 tabular-nums">
              {formatCurrency(income.pendingBonusTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Composition — a glass module next to the headline */}
      <Card variant="glass" className="flex flex-col">
        <CardContent className="flex h-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Состав дохода</h3>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-500/20 text-ink-900">
              <Icon name="percent" size="sm" />
            </span>
          </div>

          <CompositionBar base={income.base} bonus={income.earnedBonusTotal} />

          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-text-tertiary">
                <span className="h-2 w-2 rounded-full bg-ink-900" aria-hidden="true" />
                Базовая часть
              </dt>
              <dd className="font-medium tabular-nums">{formatCurrency(income.base)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-text-tertiary">
                <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />
                Бонусы
              </dt>
              <dd className="font-medium tabular-nums">
                {formatCurrency(income.earnedBonusTotal)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

/** Horizontal bar showing the share of the base part and the bonus part. */
function CompositionBar({ base, bonus }: { base: number; bonus: number }) {
  const total = base + bonus;
  const baseShare = total > 0 ? (base / total) * 100 : 100;

  return (
    <div
      className="flex h-3 w-full overflow-hidden rounded-full bg-background-tertiary"
      role="img"
      aria-label={`Базовая часть ${Math.round(baseShare)} %, бонусы ${Math.round(100 - baseShare)} %`}
    >
      <span className="h-full bg-ink-900" style={{ width: `${baseShare}%` }} />
      <span className="h-full flex-1 bg-brand-500" />
    </div>
  );
}

/**
 * Bonus breakdown — explains «из чего складывается мой доход?».
 */
export function BonusBreakdownWidget({ income }: { income: IncomeSummary }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base">Детализация бонусов</h3>
          <span className="text-xs text-text-tertiary">
            {income.bonuses.filter((bonus) => bonus.status === 'earned').length} из{' '}
            {income.bonuses.length} начислено
          </span>
        </div>

        <ul className="flex flex-col gap-2">
          {income.bonuses.map((bonus) => (
            <li
              key={bonus.id}
              className="flex items-center gap-3 rounded-xl border border-border-secondary bg-background-tertiary/50 p-3"
            >
              <span
                className={
                  bonus.status === 'earned'
                    ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-bg text-success-600'
                    : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background-tertiary text-text-tertiary'
                }
                aria-hidden="true"
              >
                <Icon name={bonus.status === 'earned' ? 'check' : 'clock'} size="sm" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{bonus.title}</p>
                <p className="truncate text-xs text-text-tertiary">{bonus.basis}</p>
              </div>

              <div className="flex shrink-0 flex-col items-end">
                <span className="text-sm font-semibold tabular-nums text-text-primary">
                  {formatCurrency(bonus.amount)}
                </span>
                {bonus.status === 'pending' && (
                  <span className="text-[0.6875rem] text-text-muted">ожидается</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
