import { describe, expect, it } from 'vitest';

import {
  formatCurrency,
  formatCurrencyCompact,
  formatDelta,
  formatNumber,
  formatPercent,
} from '../format/format';

describe('formatCurrency', () => {
  it('formats a ruble amount without decimals', () => {
    expect(formatCurrency(148_320)).toContain('148');
    expect(formatCurrency(148_320)).toContain('₽');
    expect(formatCurrency(148_320)).not.toContain('.');
  });

  it('falls back to zero for non-finite input', () => {
    expect(formatCurrency(Number.NaN)).toBe(formatCurrency(0));
  });
});

describe('formatNumber', () => {
  it('groups thousands', () => {
    // ru-RU uses a non-breaking space as the group separator.
    const formatted = formatNumber(1_234_567);
    expect(formatted).toContain('1');
    expect(formatted).toContain('234');
    expect(formatted).toContain('567');
    expect(formatted).not.toContain(',');
  });
});

describe('formatCurrencyCompact', () => {
  it('uses thousands for medium amounts', () => {
    expect(formatCurrencyCompact(148_300)).toBe('148,3 тыс. ₽');
  });

  it('uses millions for large amounts', () => {
    expect(formatCurrencyCompact(2_500_000)).toBe('2,5 млн ₽');
  });

  it('keeps small amounts as-is', () => {
    expect(formatCurrencyCompact(750)).toBe('750 ₽');
  });
});

describe('formatPercent', () => {
  it('uses a comma as the decimal separator', () => {
    expect(formatPercent(89.9)).toBe('89,9%');
  });
});

describe('formatDelta', () => {
  it('signs positive and negative deltas', () => {
    expect(formatDelta(12.4)).toBe('+12,4%');
    expect(formatDelta(-3.1)).toBe('−3,1%');
    expect(formatDelta(0)).toBe('0%');
  });
});
