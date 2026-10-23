/**
 * Money and percentage formatting.
 *
 * Kept in `core` so that both the UI and any future server-side
 * renderer produce byte-identical output.
 */

const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formatter that keeps one decimal — used by the compact formats. */
const compactNumberFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** Formats an amount as a ruble string, e.g. «148 320 ₽». */
export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return rubFormatter.format(0);
  return rubFormatter.format(amount);
}

/** Formats a plain number with a thin space thousands separator. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return numberFormatter.format(0);
  return numberFormatter.format(value);
}

/**
 * Compact ruble format used for chart axes and dense tables,
 * e.g. «148,3 тыс. ₽».
 */
export function formatCurrencyCompact(amount: number): string {
  if (!Number.isFinite(amount)) return '0 ₽';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `${compactNumberFormatter.format(amount / 1_000_000)} млн ₽`;
  }
  if (abs >= 1_000) {
    return `${compactNumberFormatter.format(amount / 1_000)} тыс. ₽`;
  }
  return `${numberFormatter.format(amount)} ₽`;
}

/** Formats a percentage with one decimal, e.g. «89,9%». */
export function formatPercent(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(fractionDigits).replace('.', ',')}%`;
}

/** Formats a signed delta, e.g. «+12,4%» or «−3,1%». */
export function formatDelta(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return '0%';
  if (value === 0) return '0%';
  const sign = value > 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toFixed(fractionDigits).replace('.', ',')}%`;
}
