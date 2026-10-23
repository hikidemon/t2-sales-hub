/**
 * Sync status domain model.
 *
 * Framework-independent: describes the state of the periodic
 * synchronisation with the external data source.
 */

export type SyncState = 'idle' | 'syncing' | 'ok' | 'error' | 'stale';

export interface SyncStatus {
  /** Current state of the sync pipeline. */
  state: SyncState;
  /** Which source produced the cached snapshot. */
  source: 'mock' | 'google-sheets';
  /** ISO timestamp of the last successful synchronisation. */
  lastSuccessAt: string | null;
  /** ISO timestamp of the last attempt, successful or not. */
  lastAttemptAt: string | null;
  /** Duration of the last successful sync in milliseconds. */
  lastDurationMs: number | null;
  /** Message of the last error, if any. */
  lastError: string | null;
  /** Consecutive failed attempts since the last success. */
  consecutiveFailures: number;
  /** Configured interval between automatic syncs, in milliseconds. */
  intervalMs: number;
  /** True while a snapshot from a previous successful sync is being served. */
  servingStaleData: boolean;
}

/** A snapshot of normalised dashboard data plus its provenance. */
export interface DataSnapshot<TData> {
  data: TData;
  /** When this snapshot was produced. */
  capturedAt: string;
  /** Source that produced it. */
  source: 'mock' | 'google-sheets';
}

/** Result of a single synchronisation attempt. */
export interface SyncAttemptResult {
  ok: boolean;
  /** ISO timestamp of the attempt. */
  at: string;
  durationMs: number;
  error?: string;
}
