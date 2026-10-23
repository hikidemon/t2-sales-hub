/**
 * Data synchronisation service.
 *
 * Responsibilities:
 *   - run an initial import at startup;
 *   - refresh the snapshot on a configurable interval;
 *   - keep the last successful snapshot so a temporary source failure
 *     never empties the screen;
 *   - retry with exponential backoff;
 *   - refuse to run two syncs at the same time;
 *   - report the current status.
 *
 * Framework-free: it uses timers and a clock that can be injected,
 * so the behaviour is testable without waiting for real time.
 */

import type { DashboardData, Period, PeriodId } from '../domain/dashboard.js';
import type { DataSnapshot, SyncAttemptResult, SyncStatus } from '../domain/sync.js';
import type { DashboardDataSourceAdapter } from '../adapters/DataSourceAdapter.js';

export interface SyncServiceOptions {
  /** Adapter that produces the data. */
  adapter: DashboardDataSourceAdapter;
  /** Interval between automatic syncs, in milliseconds. */
  intervalMs: number;
  /** Maximum number of consecutive retries before giving up. */
  maxRetries?: number;
  /** Base delay for the exponential backoff, in milliseconds. */
  retryBaseDelayMs?: number;
  /** Maximum backoff delay, in milliseconds. */
  retryMaxDelayMs?: number;
  /** Snapshot older than this is reported as stale. */
  staleAfterMs?: number;
  /** Injected clock. */
  now?: () => Date;
  /** Injected timer functions. */
  setIntervalImpl?: (handler: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearIntervalImpl?: (handle: ReturnType<typeof setInterval>) => void;
  /** Called after every attempt — used for logging. */
  onAttempt?: (result: SyncAttemptResult) => void;
}

export class DataSyncService {
  private readonly options: Required<Omit<SyncServiceOptions, 'onAttempt'>> & {
    onAttempt?: (result: SyncAttemptResult) => void;
  };

  private snapshot: DataSnapshot<DashboardData> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private inFlight: Promise<SyncAttemptResult> | null = null;

  private lastSuccessAt: string | null = null;
  private lastAttemptAt: string | null = null;
  private lastDurationMs: number | null = null;
  private lastError: string | null = null;
  private consecutiveFailures = 0;

  constructor(options: SyncServiceOptions) {
    this.options = {
      adapter: options.adapter,
      intervalMs: options.intervalMs,
      maxRetries: options.maxRetries ?? 3,
      retryBaseDelayMs: options.retryBaseDelayMs ?? 1_000,
      retryMaxDelayMs: options.retryMaxDelayMs ?? 30_000,
      staleAfterMs: options.staleAfterMs ?? 15 * 60_000,
      now: options.now ?? (() => new Date()),
      setIntervalImpl: options.setIntervalImpl ?? ((handler, ms) => setInterval(handler, ms)),
      clearIntervalImpl: options.clearIntervalImpl ?? ((handle) => clearInterval(handle)),
      onAttempt: options.onAttempt,
    };
  }

  private now(): Date {
    return this.options.now();
  }

  /**
   * Performs a single synchronisation attempt.
   *
   * Concurrent calls share one in-flight promise — a manual refresh
   * during an automatic run does not start a second request.
   */
  async sync(periodId?: PeriodId): Promise<SyncAttemptResult> {
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.performSync(periodId).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async performSync(periodId?: PeriodId): Promise<SyncAttemptResult> {
    const startedAt = this.now();
    this.running = true;
    this.lastAttemptAt = startedAt.toISOString();

    try {
      const data = await this.options.adapter.fetchDashboard(periodId);
      const finishedAt = this.now();

      this.snapshot = {
        data,
        capturedAt: finishedAt.toISOString(),
        source: this.options.adapter.kind === 'mock' ? 'mock' : 'google-sheets',
      };
      this.lastSuccessAt = finishedAt.toISOString();
      this.lastDurationMs = finishedAt.getTime() - startedAt.getTime();
      this.lastError = null;
      this.consecutiveFailures = 0;

      const result: SyncAttemptResult = {
        ok: true,
        at: finishedAt.toISOString(),
        durationMs: this.lastDurationMs,
      };
      this.options.onAttempt?.(result);
      return result;
    } catch (error) {
      const finishedAt = this.now();
      const message = error instanceof Error ? error.message : String(error);

      this.lastError = message;
      this.consecutiveFailures += 1;
      this.lastDurationMs = finishedAt.getTime() - startedAt.getTime();

      const result: SyncAttemptResult = {
        ok: false,
        at: finishedAt.toISOString(),
        durationMs: this.lastDurationMs,
        error: message,
      };
      this.options.onAttempt?.(result);
      return result;
    } finally {
      this.running = false;
    }
  }

  /**
   * Syncs with retries and exponential backoff.
   * Used by the scheduler so a transient failure does not end the cycle.
   */
  async syncWithRetry(periodId?: PeriodId): Promise<SyncAttemptResult> {
    let attempt = 0;
    let last: SyncAttemptResult | null = null;

    while (attempt < this.options.maxRetries) {
      last = await this.sync(periodId);
      if (last.ok) return last;

      attempt += 1;
      if (attempt >= this.options.maxRetries) break;

      const delay = Math.min(
        this.options.retryBaseDelayMs * 2 ** (attempt - 1),
        this.options.retryMaxDelayMs
      );
      await this.wait(delay);
    }

    return (
      last ?? {
        ok: false,
        at: this.now().toISOString(),
        durationMs: 0,
        error: 'Sync did not run',
      }
    );
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * The periods the source can serve.
   *
   * The client renders the period switcher from this list, so it never
   * offers a period the source does not have. Falling back to the demo
   * dataset for a missing period would silently mix synthetic figures
   * with live ones.
   */
  async listAvailablePeriods(): Promise<Period[]> {
    try {
      return await this.options.adapter.listPeriods();
    } catch {
      return [];
    }
  }

  /** Returns the cached snapshot, or null when nothing was synced yet. */
  getSnapshot(): DataSnapshot<DashboardData> | null {
    return this.snapshot;
  }

  /** Returns the cached data, or null when nothing was synced yet. */
  getData(): DashboardData | null {
    return this.snapshot?.data ?? null;
  }

  /** Current status of the sync pipeline. */
  getStatus(): SyncStatus {
    const snapshotAge = this.snapshot
      ? this.now().getTime() - new Date(this.snapshot.capturedAt).getTime()
      : null;

    const isStale = snapshotAge !== null && snapshotAge > this.options.staleAfterMs;

    let state: SyncStatus['state'];
    if (this.running) {
      state = 'syncing';
    } else if (this.lastError) {
      state = 'error';
    } else if (this.snapshot) {
      state = isStale ? 'stale' : 'ok';
    } else {
      state = 'idle';
    }

    return {
      state,
      source: this.snapshot?.source ?? 'mock',
      lastSuccessAt: this.lastSuccessAt,
      lastAttemptAt: this.lastAttemptAt,
      lastDurationMs: this.lastDurationMs,
      lastError: this.lastError,
      consecutiveFailures: this.consecutiveFailures,
      intervalMs: this.options.intervalMs,
      servingStaleData: Boolean(this.snapshot) && Boolean(this.lastError),
    };
  }

  /** Starts the periodic synchronisation. */
  start(periodId?: PeriodId): void {
    if (this.timer) return;

    this.timer = this.options.setIntervalImpl(() => {
      void this.syncWithRetry(periodId);
    }, this.options.intervalMs);
  }

  /** Stops the periodic synchronisation and clears the timer. */
  stop(): void {
    if (!this.timer) return;
    this.options.clearIntervalImpl(this.timer);
    this.timer = null;
  }
}
