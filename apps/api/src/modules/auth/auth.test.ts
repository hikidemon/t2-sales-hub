import { describe, expect, it } from 'vitest';

import {
  AbcT2Client,
  AuthService,
  InMemorySessionStore,
  type AuthProviderConfig,
} from '@t2-sales-hub/core';

import { createApp, type AppServices } from '../../app.js';
import { InMemoryNotificationService } from '../notifications/service.js';
import { InMemoryQuizService } from '../tests/service.js';
import { signSessionId, verifySessionId } from './cookie.js';

const CONFIG: AuthProviderConfig = {
  providerId: 'abc-t2',
  authorizationUrl: 'https://abc.t2.ru/oauth/authorize',
  tokenUrl: 'https://abc.t2.ru/oauth/token',
  userInfoUrl: 'https://abc.t2.ru/api/v1/me',
  clientId: 'client-123',
  clientSecret: 'secret-456',
  redirectUri: 'http://localhost:3001/api/auth/abc-t2/callback',
  scopes: ['profile'],
};

const COOKIE_SECRET = 'test-cookie-secret-value-123456';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function createPortal() {
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    if (url === CONFIG.tokenUrl) {
      const body = new URLSearchParams(String(init?.body ?? ''));
      if (body.get('code') !== 'valid-code') {
        return jsonResponse({ error: 'invalid_grant' }, 400);
      }
      return jsonResponse({
        access_token: 'access-abc-123',
        refresh_token: 'refresh-abc-456',
        expires_in: 3600,
      });
    }
    if (url === CONFIG.userInfoUrl) {
      return jsonResponse({
        id: 4711,
        full_name: 'Иванова Пётр Петрович',
        login: 'i.petrova',
        roles: ['seller'],
      });
    }
    return jsonResponse({ error: 'not found' }, 404);
  }) as unknown as typeof fetch;

  return fetchImpl;
}

function createServices(fetchImpl: typeof fetch): {
  services: AppServices;
  sessions: InMemorySessionStore;
} {
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
      notificationService: new InMemoryNotificationService(),
      quizService: new InMemoryQuizService(),
      integrationAdapters: new Map(),
      authService,
    },
    sessions,
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
      setCookie: response.headers.getSetCookie?.() ?? [],
      body,
    };
  } finally {
    server.close();
  }
}

describe('auth routes', () => {
  it('reports the provider configuration', async () => {
    const { services } = createServices(createPortal());
    const result = await call(createApp(services), '/api/auth/config');

    expect(result.status).toBe(200);
    const body = result.body as {
      provider: string;
      providerName: string;
      providerConfigured: boolean;
    };
    expect(body.provider).toBe('abc-t2');
    expect(body.providerName).toBe('ABC T2');
    expect(body.providerConfigured).toBe(true);
  });

  it('redirects the sign-in to the provider', async () => {
    const { services } = createServices(createPortal());
    const result = await call(createApp(services), '/api/auth/abc-t2/login');

    expect(result.status).toBe(302);
    expect(result.location).toContain('https://abc.t2.ru/oauth/authorize');
    expect(result.location).toContain('client_id=client-123');
    expect(result.location).toContain('code_challenge=');
    expect(result.location).toContain('state=');
  });

  it('answers with no user in demo mode', async () => {
    // In demo mode nobody has to sign in, so "no user" is an answer and
    // not an error — the browser console stays clean.
    const { services } = createServices(createPortal());
    const result = await call(createApp(services), '/api/auth/me');

    expect(result.status).toBe(200);
    expect((result.body as { user: unknown }).user).toBeNull();
  });
});

describe('signed session cookies', () => {
  it('verifies a cookie it produced', () => {
    const signed = signSessionId('session-123', COOKIE_SECRET);
    expect(verifySessionId(signed, COOKIE_SECRET)).toBe('session-123');
  });

  it('rejects a cookie signed with another secret', () => {
    const signed = signSessionId('session-123', COOKIE_SECRET);
    expect(verifySessionId(signed, 'another-secret-value-0987654321')).toBeNull();
  });

  it('rejects a tampered cookie', () => {
    const signed = signSessionId('session-123', COOKIE_SECRET);
    const tampered = signed.replace('session-123', 'session-999');
    expect(verifySessionId(tampered, COOKIE_SECRET)).toBeNull();
  });

  it('rejects a malformed cookie', () => {
    expect(verifySessionId('garbage', COOKIE_SECRET)).toBeNull();
    expect(verifySessionId(undefined, COOKIE_SECRET)).toBeNull();
  });
});
