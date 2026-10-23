/**
 * Server-side wiring of the data source and the sync pipeline.
 *
 * The source is chosen by configuration; the rest of the application
 * only talks to `DataSyncService`, so switching between the mock and
 * the live source requires no code change.
 */

import {
  DataSyncService,
  GoogleSheetsAdapter,
  MockDashboardAdapter,
  type DashboardDataSourceAdapter,
} from '@t2-sales-hub/core';

import { env } from '../../shared/config/env.js';

/**
 * Creates the configured data source adapter.
 * Falls back to the mock adapter when Google Sheets is selected but not
 * configured, so the server always starts.
 */
export function createDataSourceAdapter(): DashboardDataSourceAdapter {
  if (env.DATA_SOURCE === 'google-sheets' && env.GOOGLE_SHEETS_SPREADSHEET_ID) {
    return new GoogleSheetsAdapter({
      spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
      gid: env.GOOGLE_SHEETS_REPORT_GID,
      timeoutMs: env.GOOGLE_SHEETS_TIMEOUT_MS,
    });
  }

  return new MockDashboardAdapter();
}

/** Creates the sync service for the configured source. */
export function createSyncService(
  adapter: DashboardDataSourceAdapter = createDataSourceAdapter()
): DataSyncService {
  return new DataSyncService({
    adapter,
    intervalMs: env.SYNC_INTERVAL_MS,
    maxRetries: env.SYNC_MAX_RETRIES,
    staleAfterMs: env.SYNC_STALE_AFTER_MS,
    onAttempt: (result) => {
      if (result.ok) {
        console.warn(`[api] Sync succeeded in ${result.durationMs} ms`);
      } else {
        console.error(`[api] Sync failed: ${result.error}`);
      }
    },
  });
}
