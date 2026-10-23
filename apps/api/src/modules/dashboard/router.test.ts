import { describe, expect, it } from 'vitest';

import {
  DataSyncService,
  MockDashboardAdapter,
  demoAssignments,
  demoAttempts,
  demoNotifications,
  demoTests,
  type ExternalSystemAdapter,
  type ExternalSystemKind,
} from '@t2-sales-hub/core';

import { createApp, type AppServices } from '../../app.js';
import { InMemoryNotificationService } from '../notifications/service.js';
import { InMemoryQuizService } from '../tests/service.js';

function createServices(adapterOverrides: Partial<AppServices> = {}): AppServices {
  const syncService = new DataSyncService({
    adapter: new MockDashboardAdapter(),
    intervalMs: 60_000,
  });

  const integrationAdapters = new Map<ExternalSystemKind, ExternalSystemAdapter>([
    [
      'abc-t2',
      {
        kind: 'abc-t2',
        displayName: 'ABC T2',
        isAvailable: async () => false,
        describeUnavailableReason: async () => 'Доступ не предоставлен',
      },
    ],
  ]);

  return {
    syncService,
    notificationService: new InMemoryNotificationService(demoNotifications),
    quizService: new InMemoryQuizService(demoTests, demoAttempts, demoAssignments),
    integrationAdapters,
    ...adapterOverrides,
  };
}

async function call(app: ReturnType<typeof createApp>, path: string, init?: RequestInit) {
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, init);
    const text = await response.text();
    return {
      status: response.status,
      body: text ? (JSON.parse(text) as unknown) : null,
    };
  } finally {
    server.close();
  }
}

describe('API — dashboard and sync', () => {
  it('reports health', async () => {
    const app = createApp(createServices());
    const result = await call(app, '/api/health');

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('status');
  });

  it('returns 503 before the first synchronisation', async () => {
    const app = createApp(createServices());
    const result = await call(app, '/api/dashboard');

    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ error: { code: 'data_not_ready' } });
  });

  it('serves the dashboard after a synchronisation', async () => {
    const services = createServices();
    await services.syncService.sync();

    const result = await call(createApp(services), '/api/dashboard');

    expect(result.status).toBe(200);
    const body = result.body as { data: { period: { id: string } } };
    expect(body.data.period.id).toBe('2026-10');
  });

  it('rejects an unknown period', async () => {
    const services = createServices();
    await services.syncService.sync();

    const result = await call(createApp(services), '/api/dashboard?period=1999-01');

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ error: { code: 'period_not_found' } });
  });
});

describe('API — notifications', () => {
  it('lists the notifications with a summary', async () => {
    const app = createApp(createServices());
    const result = await call(app, '/api/notifications');

    expect(result.status).toBe(200);
    const body = result.body as { items: unknown[]; summary: { unread: number } };
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.summary.unread).toBeGreaterThan(0);
  });

  it('filters by category', async () => {
    const app = createApp(createServices());
    const result = await call(app, '/api/notifications?category=test');

    expect(result.status).toBe(200);
    const body = result.body as { items: Array<{ category: string }> };
    expect(body.items.every((item) => item.category === 'test')).toBe(true);
  });

  it('rejects an unknown category', async () => {
    const app = createApp(createServices());
    const result = await call(app, '/api/notifications?category=nonsense');

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: { code: 'invalid_category' } });
  });

  it('marks a notification as read', async () => {
    const app = createApp(createServices());
    const result = await call(app, '/api/notifications/notif-1/read', {
      method: 'POST',
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true });
  });

  it('returns 404 for an unknown notification', async () => {
    const app = createApp(createServices());
    const result = await call(app, '/api/notifications/nope/read', {
      method: 'POST',
    });

    expect(result.status).toBe(404);
  });
});

describe('API — tests', () => {
  it('lists the tests assigned to the current seller', async () => {
    const app = createApp(createServices());
    const result = await call(app, '/api/tests/assigned/mine');

    expect(result.status).toBe(200);
    const body = result.body as { items: Array<{ id: string; state: string }> };
    expect(body.items.length).toBeGreaterThan(0);
    // Assigned tests come first.
    expect(body.items[0]?.state).toBe('assigned');
  });

  it('grades a submitted attempt', async () => {
    const app = createApp(createServices());
    const result = await call(app, '/api/tests/quiz-models-november/attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        answers: { q1: 'o2', q2: 'o3', q3: 'o2', q4: 'o2' },
        startedAtMs: Date.now() - 60_000,
      }),
    });

    expect(result.status).toBe(200);
    const body = result.body as {
      attempt: { scorePercent: number; passed: boolean };
    };
    expect(body.attempt.scorePercent).toBe(100);
    expect(body.attempt.passed).toBe(true);
  });

  it('rejects an invalid attempt payload', async () => {
    const app = createApp(createServices());
    const result = await call(app, '/api/tests/quiz-models-november/attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: 'not-an-object' }),
    });

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: { code: 'invalid_payload' } });
  });

  it('disables curator actions when no token is configured', async () => {
    const app = createApp(createServices());
    const result = await call(app, '/api/tests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Тест' }),
    });

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ error: { code: 'curator_disabled' } });
  });
});

describe('API — integrations', () => {
  it('reports the state of every known system', async () => {
    const app = createApp(createServices());
    const result = await call(app, '/api/integrations');

    expect(result.status).toBe(200);
    const body = result.body as {
      items: Array<{ kind: string; state: string; missingRequirements: string[] }>;
    };

    const abc = body.items.find((item) => item.kind === 'abc-t2');
    expect(abc?.state).toBe('not-configured');
    expect(abc?.missingRequirements.length).toBeGreaterThan(0);
  });

  it('returns 404 for an unknown system', async () => {
    const app = createApp(createServices());
    const result = await call(app, '/api/integrations/unknown');

    expect(result.status).toBe(404);
  });
});
