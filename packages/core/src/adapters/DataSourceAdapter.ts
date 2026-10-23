/**
 * Data source adapter contract.
 *
 * All sources of business data (mock, Google Sheets, 1C) implement this
 * interface so that business logic never depends on a concrete transport.
 *
 * Stage 1 shipped only the contract. Stage 2 adds the demo (mock)
 * implementation; later stages add the real ones:
 *  - GoogleSheetsAdapter   — Stage 7 (after the sheet access method is agreed);
 *  - OneCAdapter           — Stage 8 (after an official integration spec exists).
 *
 * IMPORTANT: fetch/result methods are intentionally NOT declared for
 * external systems yet — their shapes depend on confirmed data schemas.
 * Do not invent fields for external systems before the schemas are approved.
 */

import type { DashboardData, Period, PeriodId } from '../domain/dashboard.js';

/** Identifies where business data comes from. */
export type DataSourceKind = 'mock' | 'google-sheets' | 'onec';

/**
 * Minimal adapter contract available at this stage.
 * Any adapter must be able to report whether it can serve data right now
 * (e.g. credentials missing, sheet not shared, 1C unavailable).
 */
export interface DataSourceAdapter {
  readonly kind: DataSourceKind;

  /**
   * Returns true when the source is configured and reachable.
   * Must never throw — failures are reported as `false` (+ logged server-side).
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Adapter able to serve the seller dashboard.
 * Extends the base contract — the base one stays valid for sources
 * that do not (yet) implement the dashboard schema.
 */
export interface DashboardDataSourceAdapter extends DataSourceAdapter {
  /**
   * Loads the dashboard dataset for a period.
   * Resolves with the current period when `periodId` is unknown.
   */
  fetchDashboard(periodId?: PeriodId): Promise<DashboardData>;

  /**
   * The periods the source can actually serve.
   *
   * The client must not offer a period the source does not have — a
   * request for a missing period would otherwise fall back to the demo
   * dataset and mix synthetic figures with live ones.
   */
  listPeriods(): Promise<Period[]>;
}
