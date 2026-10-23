/**
 * Demo (mock) implementation of the dashboard data source.
 *
 * Serves the synthetic dataset from `data/demoDashboard.ts`.
 * It is intentionally asynchronous so that swapping it for a real
 * transport (Sheets / 1C) requires no changes in the UI layer.
 */

import type { DashboardData, Period, PeriodId } from '../domain/dashboard.js';
import { buildDemoDashboard, demoPeriods } from '../data/demoDashboard.js';
import type { DashboardDataSourceAdapter } from './DataSourceAdapter.js';

export class MockDashboardAdapter implements DashboardDataSourceAdapter {
  readonly kind = 'mock' as const;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async fetchDashboard(periodId?: PeriodId): Promise<DashboardData> {
    return buildDemoDashboard(periodId);
  }

  /** Periods available in the demo dataset, newest first. */
  async listPeriods(): Promise<Period[]> {
    return this.listPeriodsSync();
  }

  /** Synchronous variant, kept for the local fallback in the browser. */
  listPeriodsSync(): Period[] {
    return demoPeriods;
  }
}
