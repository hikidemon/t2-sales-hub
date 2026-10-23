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

describe('resilience to a source failure', () => {
  it('keeps serving the last successful snapshot', async () => {
    let shouldFail = false;
    const adapter: DashboardDataSourceAdapter = {
      kind: 'google-sheets',
      isAvailable: async () => true,
      fetchDashboard: async () => {
        if (shouldFail) {
          throw new Error('Google Sheets is temporarily unavailable');
        }
        return { income: { total: 1000 } } as unknown as DashboardData;
      },
    };

    const service = new DataSyncService({ adapter, intervalMs: 60_000 });
    const app = createApp(buildServices(service));

    await service.sync();

    const before = await call(app, '/api/dashboard');
    expect(before.status).toBe(200);

    // The source breaks; the next sync fails.
    shouldFail = true;
    const result = await service.sync();
    expect(result.ok).toBe(false);

    // The dashboard must still answer with the previous snapshot.
    const after = await call(app, '/api/dashboard');
    expect(after.status).toBe(200);
    const body = after.body as { data: { income: { total: number } } };
    expect(body.data.income.total).toBe(1000);

    // The status must report the failure and that stale data is served.
    const status = await call(app, '/api/sync/status');
    const statusBody = status.body as {
      state: string;
      servingStaleData: boolean;
      lastError: string;
    };
    expect(statusBody.state).toBe('error');
    expect(statusBody.servingStaleData).toBe(true);
    expect(statusBody.lastError).toContain('temporarily unavailable');
  });

  it('recovers automatically once the source is back', async () => {
    let shouldFail = true;
    const adapter: DashboardDataSourceAdapter = {
      kind: 'google-sheets',
      isAvailable: async () => true,
      fetchDashboard: async () => {
        if (shouldFail) throw new Error('source down');
        return { income: { total: 1000 } } as unknown as DashboardData;
      },
    };

    const service = new DataSyncService({ adapter, intervalMs: 60_000 });
    const app = createApp(buildServices(service));

    const failed = await service.sync();
    expect(failed.ok).toBe(false);

    shouldFail = false;
    const recovered = await service.sync();

    expect(recovered.ok).toBe(true);
    const status = await call(app, '/api/sync/status');
    expect((status.body as { state: string }).state).toBe('ok');
  });
});
