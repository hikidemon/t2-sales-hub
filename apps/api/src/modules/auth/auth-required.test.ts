/**
 * The behaviour of the auth routes when a sign-in is required.
 *
 * The environment is read when the configuration module is first
 * imported, so the modules under test are imported dynamically after
 * `AUTH_REQUIRED` has been set.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import type * as AppModule from '../../app.js';
import type * as CoreModule from '@t2-sales-hub/core';

const CONFIG: CoreModule.AuthProviderConfig = {
  providerId: 'abc-t2',
  authorizationUrl: 'https://abc.t2.ru/oauth/authorize',
  tokenUrl: 'https://abc.t2.ru/oauth/token',
  userInfoUrl: 'https://abc.t2.ru/api/v1/me',
  clientId: 'client-123',
  clientSecret: 'secret-456',
  redirectUri: 'http://localhost:3001/api/auth/abc-t2/callback',
  scopes: ['profile'],
};

let createApp: typeof AppModule.createApp;
let AbcT2Client: typeof CoreModule.AbcT2Client;
let AuthService: typeof CoreModule.AuthService;
let InMemorySessionStore: typeof CoreModule.InMemorySessionStore;

beforeAll(async () => {
  process.env.AUTH_REQUIRED = 'true';
  process.env.AUTH_COOKIE_SECRET = 'test-cookie-secret-value-123456';

  const appModule = await import('../../app.js');
  const coreModule = await import('@t2-sales-hub/core');

  createApp = appModule.createApp;
  AbcT2Client = coreModule.AbcT2Client;
  AuthService = coreModule.AuthService;
  InMemorySessionStore = coreModule.InMemorySessionStore;
});

function createServices() {
  const fetchImpl = (async () => new Response('{}', { status: 404 })) as unknown as typeof fetch;

  const client = new AbcT2Client({ config: CONFIG, fetchImpl });
  const sessions = new InMemorySessionStore(60_000);
  const authService = new AuthService({ client, sessions });

  const syncService = {
    getSnapshot: () => null,
    getStatus: () => ({
      state: 'idle' as const,
      source: 'mock' as const,
      lastSuccessAt: null,
      lastAttemptAt: null,
      lastDurationMs: null,
      lastError: null,
      consecutiveFailures: 0,
      intervalMs: 60_000,
      servingStaleData: false,
    }),
    listAvailablePeriods: async () => [],
  };

  return {
    services: {
      syncService: syncService as never,
      notificationService: { list: async () => [] } as never,
      quizService: {} as never,
      integrationAdapters: new Map(),
      authService,
    },
  };
}

async function call(app: ReturnType<typeof createApp>, path: string, init?: RequestInit) {
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      redirect: 'manual',
      ...init,
    });
    const text = await response.text();
    let body: unknown = null;
    if (text && !text.trimStart().startsWith('<')) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = text;
      }
    }
    return {
      status: response.status,
      location: response.headers.get('location'),
      body,
    };
  } finally {
    server.close();
  }
}

describe('auth routes with a required sign-in', () => {
  it('returns 401 for the profile without a session', async () => {
    const { services } = createServices();
    const result = await call(createApp(services), '/api/auth/me');

    expect(result.status).toBe(401);
  });

  it('reports that a sign-in is required', async () => {
    const { services } = createServices();
    const result = await call(createApp(services), '/api/auth/config');

    expect(result.status).toBe(200);
    expect((result.body as { required: boolean }).required).toBe(true);
  });

  it('redirects a sign-in to the provider', async () => {
    const { services } = createServices();
    const result = await call(createApp(services), '/api/auth/abc-t2/login');

    expect(result.status).toBe(302);
    expect(result.location).toContain('https://abc.t2.ru/oauth/authorize');
  });
});
