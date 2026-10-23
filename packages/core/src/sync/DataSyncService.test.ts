import { describe, expect, it, vi } from 'vitest';

import { DataSyncService } from './DataSyncService';
import type { DashboardDataSourceAdapter } from '../adapters/DataSourceAdapter';
import type { DashboardData } from '../domain/dashboard';

const FAKE_DATA = { period: { id: '2026-10' } } as unknown as DashboardData;

function createAdapter(behaviour: () => Promise<DashboardData>): DashboardDataSourceAdapter {
  return {
    kind: 'google-sheets',
    isAvailable: async () => true,
    fetchDashboard: behaviour,
  } as DashboardDataSourceAdapter;
}

describe('DataSyncService', () => {
  it('stores the snapshot after a successful sync', async () => {
    const service = new DataSyncService({
      adapter: createAdapter(async () => FAKE_DATA),
      intervalMs: 60_000,
    });

    const result = await service.sync();

    expect(result.ok).toBe(true);
    expect(service.getData()).toBe(FAKE_DATA);
    expect(service.getStatus().state).toBe('ok');
    expect(service.getStatus().lastSuccessAt).not.toBeNull();
  });

  it('keeps the previous snapshot when a sync fails', async () => {
    let shouldFail = false;
    const service = new DataSyncService({
      adapter: createAdapter(async () => {
        if (shouldFail) throw new Error('source unavailable');
        return FAKE_DATA;
      }),
      intervalMs: 60_000,
    });

    await service.sync();
    shouldFail = true;

    const result = await service.sync();

    expect(result.ok).toBe(false);
    // The old snapshot is still served.
    expect(service.getData()).toBe(FAKE_DATA);
    expect(service.getStatus().state).toBe('error');
    expect(service.getStatus().servingStaleData).toBe(true);
    expect(service.getStatus().consecutiveFailures).toBe(1);
  });

  it('does not run two syncs concurrently', async () => {
    let resolveFetch: ((value: DashboardData) => void) | undefined;
    const fetchDashboard = vi.fn(
      () =>
        new Promise<DashboardData>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const service = new DataSyncService({
      adapter: createAdapter(fetchDashboard),
      intervalMs: 60_000,
    });

    const first = service.sync();
    const second = service.sync();

    expect(fetchDashboard).toHaveBeenCalledTimes(1);

    resolveFetch?.(FAKE_DATA);
    await Promise.all([first, second]);
  });

  it('retries with backoff and eventually succeeds', async () => {
    let attempts = 0;
    const service = new DataSyncService({
      adapter: createAdapter(async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('temporary failure');
        return FAKE_DATA;
      }),
      intervalMs: 60_000,
      maxRetries: 3,
      retryBaseDelayMs: 1,
    });

    const result = await service.syncWithRetry();

    expect(result.ok).toBe(true);
    expect(attempts).toBe(3);
  });

  it('gives up after the configured number of attempts', async () => {
    let attempts = 0;
    const service = new DataSyncService({
      adapter: createAdapter(async () => {
        attempts += 1;
        throw new Error('permanent failure');
      }),
      intervalMs: 60_000,
      maxRetries: 2,
      retryBaseDelayMs: 1,
    });

    const result = await service.syncWithRetry();

    expect(result.ok).toBe(false);
    expect(attempts).toBe(2);
    expect(service.getStatus().lastError).toBe('permanent failure');
  });

  it('marks a snapshot as stale when it is too old', async () => {
    let current = new Date('2026-10-20T10:00:00Z');
    const service = new DataSyncService({
      adapter: createAdapter(async () => FAKE_DATA),
      intervalMs: 60_000,
      staleAfterMs: 1_000,
      now: () => current,
    });

    await service.sync();
    expect(service.getStatus().state).toBe('ok');

    current = new Date('2026-10-20T10:00:30Z');
    expect(service.getStatus().state).toBe('stale');
  });

  it('stops the timer on stop()', () => {
    const clearIntervalImpl = vi.fn();
    const setIntervalImpl = vi.fn(() => 42 as unknown as ReturnType<typeof setInterval>);

    const service = new DataSyncService({
      adapter: createAdapter(async () => FAKE_DATA),
      intervalMs: 60_000,
      setIntervalImpl,
      clearIntervalImpl,
    });

    service.start();
    expect(setIntervalImpl).toHaveBeenCalledTimes(1);

    service.stop();
    expect(clearIntervalImpl).toHaveBeenCalledTimes(1);
  });
});
