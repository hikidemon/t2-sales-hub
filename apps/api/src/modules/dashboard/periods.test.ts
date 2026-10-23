import { describe, expect, it } from 'vitest';

import {
  DataSyncService,
  type DashboardData,
  type DashboardDataSourceAdapter,
} from '@t2-sales-hub/core';

import { createApp, type AppServices } from '../../app.js';
import { InMemoryNotificationService } from '../notifications/service.js';
import { InMemoryQuizService } from '../tests/service.js';

async function call(app: ReturnType<typeof createApp>, path: string) {
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    const text = await response.text();
    return {
      status: response.status,
      body: text ? (JSON.parse(text) as unknown) : null,
    };
  } finally {
    server.close();
  }
}

function buildServices(service: DataSyncService): AppServices {
  return {
    syncService: service,
    notificationService: new InMemoryNotificationService(),
    quizService: new InMemoryQuizService(),
    integrationAdapters: new Map(),
  };
}

/** An adapter that serves exactly one period. */
function createSinglePeriodAdapter(periodId = '2026-10') {
  const adapter: DashboardDataSourceAdapter = {
    kind: 'google-sheets',
    isAvailable: async () => true,
    fetchDashboard: async () =>
      ({
        period: { id: periodId, label: 'Октябрь 2026', shortLabel: 'окт. 2026' },
        income: { total: 64734 },
      }) as unknown as DashboardData,
    listPeriods: async () => [
      {
        id: periodId,
        label: 'Октябрь 2026',
        shortLabel: 'окт. 2026',
        startDate: '2026-10-01',
        totalDays: 31,
        elapsedDays: 20,
      },
    ],
  };
  return adapter;
}

describe('available periods', () => {
  it('serves only the periods the source can provide', async () => {
    const service = new DataSyncService({
      adapter: createSinglePeriodAdapter(),
      intervalMs: 60_000,
    });
    await service.sync();

    const result = await call(createApp(buildServices(service)), '/api/dashboard/periods');

    expect(result.status).toBe(200);
    const body = result.body as { items: Array<{ id: string }> };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.id).toBe('2026-10');
  });

  it('does not offer a period the source does not have', async () => {
    const service = new DataSyncService({
      adapter: createSinglePeriodAdapter(),
      intervalMs: 60_000,
    });
    await service.sync();

    // September is not in the snapshot — the client must not request it,
    // and the server must reject it rather than serve demo figures.
    const result = await call(createApp(buildServices(service)), '/api/dashboard?period=2026-09');

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ error: { code: 'period_not_found' } });
  });

  it('returns an empty list when the source cannot be reached', async () => {
    const adapter: DashboardDataSourceAdapter = {
      kind: 'google-sheets',
      isAvailable: async () => false,
      fetchDashboard: async () => {
        throw new Error('source down');
      },
      listPeriods: async () => {
        throw new Error('source down');
      },
    };

    const service = new DataSyncService({ adapter, intervalMs: 60_000 });
    const result = await call(createApp(buildServices(service)), '/api/dashboard/periods');

    expect(result.status).toBe(200);
    expect((result.body as { items: unknown[] }).items).toEqual([]);
  });
});
