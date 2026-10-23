import { describe, expect, it } from 'vitest';

import { buildDemoDashboard, demoPeriods } from './demoDashboard';
import { MockDashboardAdapter } from '../adapters/MockDashboardAdapter';

describe('buildDemoDashboard', () => {
  it('keeps the income breakdown consistent with the total', () => {
    const data = buildDemoDashboard('2026-10');

    expect(data.income.total).toBe(data.income.base + data.income.earnedBonusTotal);
  });

  it('excludes pending bonuses from the earned total', () => {
    const data = buildDemoDashboard('2026-10');
    const pendingSum = data.income.bonuses
      .filter((bonus) => bonus.status === 'pending')
      .reduce((sum, bonus) => sum + bonus.amount, 0);

    expect(data.income.pendingBonusTotal).toBe(pendingSum);
    expect(data.income.total).not.toBe(
      data.income.base + data.income.earnedBonusTotal + pendingSum
    );
  });

  it('computes plan progress from the income total', () => {
    const data = buildDemoDashboard('2026-10');

    expect(data.plan.current).toBe(data.income.total);
    expect(data.plan.percent).toBeCloseTo((data.income.total / data.plan.target) * 100, 1);
    expect(data.plan.remaining).toBe(Math.max(data.plan.target - data.income.total, 0));
  });

  it('keeps the forecast above the already earned income', () => {
    const data = buildDemoDashboard('2026-10');

    expect(data.forecast.expectedTotal).toBeGreaterThan(data.income.total);
    expect(data.forecast.expectedAdditional).toBeGreaterThan(0);
    expect(data.forecast.basis).toContain('Демо-расчёт');
  });

  it('falls back to the newest period for an unknown id', () => {
    const data = buildDemoDashboard('does-not-exist');
    expect(data.period.id).toBe(demoPeriods[0]?.id);
  });

  it('returns different datasets for different periods', () => {
    const october = buildDemoDashboard('2026-10');
    const september = buildDemoDashboard('2026-09');

    expect(october.income.total).not.toBe(september.income.total);
    expect(october.period.id).toBe('2026-10');
    expect(september.period.id).toBe('2026-09');
  });
});

describe('MockDashboardAdapter', () => {
  it('reports availability and serves the dashboard', async () => {
    const adapter = new MockDashboardAdapter();

    await expect(adapter.isAvailable()).resolves.toBe(true);
    const data = await adapter.fetchDashboard('2026-10');
    expect(data.seller.id).toBe('DEMO-0001');
  });
});
