import { describe, expect, it } from 'vitest';

import {
  AbcT2Client,
  AuthService,
  InMemorySessionStore,
  normalizeAbcT2User,
  normalizeRoles,
  type AuthProviderConfig,
} from '../index.js';

const CONFIG: AuthProviderConfig = {
  providerId: 'abc-t2',
  authorizationUrl: 'https://abc.t2.ru/oauth/authorize',
  tokenUrl: 'https://abc.t2.ru/oauth/token',
  userInfoUrl: 'https://abc.t2.ru/api/v1/me',
  clientId: 'client-123',
  clientSecret: 'secret-456',
  redirectUri: 'http://localhost:3001/api/auth/abc-t2/callback',
  scopes: ['profile', 'sales'],
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A fake ABC T2 portal. */
function createPortal(options: { user?: Record<string, unknown> } = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];

  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, ...(init ? { init } : {}) });

    if (url === CONFIG.tokenUrl) {
      const body = new URLSearchParams(String(init?.body ?? ''));
      const grantType = body.get('grant_type');

      if (grantType === 'refresh_token') {
        if (body.get('refresh_token') !== 'refresh-abc-456') {
          return jsonResponse({ error: 'invalid_grant' }, 400);
        }
        return jsonResponse({
          access_token: 'access-abc-refreshed',
          refresh_token: 'refresh-abc-456',
          expires_in: 3600,
        });
      }

      if (body.get('code') !== 'valid-code') {
        return jsonResponse({ error: 'invalid_grant' }, 400);
      }
      return jsonResponse({
        access_token: 'access-abc-123',
        refresh_token: 'refresh-abc-456',
        expires_in: 3600,
        token_type: 'Bearer',
      });
    }

    if (url === CONFIG.userInfoUrl) {
      return jsonResponse(
        options.user ?? {
          id: 4711,
          login: 'i.petrova',
          full_name: 'Иванова Пётр Петрович',
          email: 'i.petrova@t2.ru',
          position: 'Продавец-консультант',
          city: 'Новосибирск',
          roles: ['seller'],
        }
      );
    }

    return jsonResponse({ error: 'not found' }, 404);
  }) as unknown as typeof fetch;

  return { fetchImpl, calls };
}

function createService(fetchImpl: typeof fetch) {
  const client = new AbcT2Client({ config: CONFIG, fetchImpl });
  const sessions = new InMemorySessionStore(60_000);
  const authService = new AuthService({ client, sessions });
  return { authService, sessions };
}

describe('AbcT2Client', () => {
  it('builds the authorisation URL with PKCE and state', async () => {
    const { fetchImpl } = createPortal();
    const client = new AbcT2Client({ config: CONFIG, fetchImpl });

    const pkce = (await client.buildAuthorizationUrl)
      ? { verifier: 'v'.repeat(64), challenge: 'challenge', method: 'S256' as const }
      : null;
    expect(pkce).not.toBeNull();

    const url = new URL(client.buildAuthorizationUrl('state-123', pkce!));

    expect(url.origin + url.pathname).toBe(CONFIG.authorizationUrl);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe(CONFIG.clientId);
    expect(url.searchParams.get('redirect_uri')).toBe(CONFIG.redirectUri);
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('code_challenge')).toBe('challenge');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('profile sales');
  });

  it('exchanges the code for a token', async () => {
    const { fetchImpl } = createPortal();
    const client = new AbcT2Client({ config: CONFIG, fetchImpl });

    const tokens = await client.exchangeCode('valid-code', {
      verifier: 'v'.repeat(64),
      challenge: 'c',
      method: 'S256',
    });

    expect(tokens.accessToken).toBe('access-abc-123');
    expect(tokens.refreshToken).toBe('refresh-abc-456');
    expect(tokens.expiresIn).toBe(3600);
  });

  it('rejects an invalid code', async () => {
    const { fetchImpl } = createPortal();
    const client = new AbcT2Client({ config: CONFIG, fetchImpl });

    await expect(
      client.exchangeCode('wrong-code', {
        verifier: 'v'.repeat(64),
        challenge: 'c',
        method: 'S256',
      })
    ).rejects.toThrow(/Token exchange failed/);
  });

  it('reads the profile with the bearer token', async () => {
    const { fetchImpl, calls } = createPortal();
    const client = new AbcT2Client({ config: CONFIG, fetchImpl });

    const user = await client.fetchProfile('access-abc-123');

    expect(user.id).toBe('4711');
    expect(user.displayName).toBe('Иванова Пётр Петрович');
    expect(user.email).toBe('i.petrova@t2.ru');
    expect(user.roles).toContain('seller');

    const profileCall = calls.find((call) => call.url === CONFIG.userInfoUrl);
    expect((profileCall?.init?.headers as Record<string, string>).authorization).toBe(
      'Bearer access-abc-123'
    );
  });

  it('renews the access token with the refresh token', async () => {
    const { fetchImpl } = createPortal();
    const client = new AbcT2Client({ config: CONFIG, fetchImpl });

    const tokens = await client.refreshAccessToken('refresh-abc-456');
    expect(tokens.accessToken).toBe('access-abc-refreshed');
    expect(tokens.refreshToken).toBe('refresh-abc-456');
  });

  it('knows whether it is configured', () => {
    const client = new AbcT2Client({
      config: { ...CONFIG, clientId: '' },
      fetchImpl: createPortal().fetchImpl,
    });
    expect(client.isConfigured()).toBe(false);
  });
});

describe('normalizeAbcT2User', () => {
  it('reads the fields the portal is known to expose', () => {
    const user = normalizeAbcT2User({
      user_id: 'EMP-42',
      username: 'a.smirnov',
      name: 'Смирнов Алексей',
      job_title: 'Старший продавец',
      region_name: 'Новосибирск',
      groups: ['curator', 'seller'],
    });

    expect(user.id).toBe('EMP-42');
    expect(user.login).toBe('a.smirnov');
    expect(user.displayName).toBe('Смирнов Алексей');
    expect(user.position).toBe('Старший продавец');
    expect(user.region).toBe('Новосибирск');
    expect(user.roles).toEqual(['curator', 'seller']);
  });

  it('keeps the untouched payload', () => {
    const user = normalizeAbcT2User({ id: '1', custom_field: 'value' });
    expect(user.raw?.custom_field).toBe('value');
  });

  it('falls back to the seller role', () => {
    expect(normalizeRoles(['unknown-role'])).toEqual(['seller']);
    expect(normalizeRoles(undefined)).toEqual(['seller']);
  });

  it('reads the claims of the real T2 ID provider', () => {
    // The claims auth.t2.ru declares in its discovery document.
    const user = normalizeAbcT2User({
      sub: 'a1b2c3',
      PersonID: '4711',
      name: 'Иванова Пётр Петрович',
      preferred_username: 'i.petrova',
      email: 'i.petrova@t2.ru',
      role: ['seller'],
      MainOfficeID: 'Новосибирск',
      picture: 'https://auth.t2.ru/avatar.png',
    });

    expect(user.id).toBe('a1b2c3');
    expect(user.displayName).toBe('Иванова Пётр Петрович');
    expect(user.login).toBe('i.petrova');
    expect(user.email).toBe('i.petrova@t2.ru');
    expect(user.region).toBe('Новосибирск');
    expect(user.avatarUrl).toBe('https://auth.t2.ru/avatar.png');
    expect(user.roles).toEqual(['seller']);
  });

  it('falls back to PersonID when there is no sub', () => {
    const user = normalizeAbcT2User({
      PersonID: '4711',
      name: 'Пётр Иванов',
    });

    expect(user.id).toBe('4711');
  });
});

describe('AuthService', () => {
  it('completes the sign-in and creates a session', async () => {
    const { fetchImpl } = createPortal();
    const { authService } = createService(fetchImpl);

    const { authorizationUrl } = await authService.startSignIn();
    const state = new URL(authorizationUrl).searchParams.get('state')!;

    const { session } = await authService.completeSignIn('valid-code', state);

    expect(session.user.id).toBe('4711');
    expect(session.accessToken).toBe('access-abc-123');
    expect(session.refreshToken).toBe('refresh-abc-456');
    expect(session.userId).toBe('4711');
  });

  it('rejects a callback with an unknown state', async () => {
    const { fetchImpl } = createPortal();
    const { authService } = createService(fetchImpl);

    await expect(authService.completeSignIn('valid-code', 'forged-state')).rejects.toThrow(
      /Unknown or expired sign-in state/
    );
  });

  it('rejects a sign-in the provider refused', async () => {
    const { fetchImpl } = createPortal();
    const { authService } = createService(fetchImpl);

    await authService.startSignIn();

    await expect(
      authService.completeSignIn('valid-code', 'any-state', 'access_denied')
    ).rejects.toThrow(/access_denied/);
  });

  it('keeps the session across a browser restart', async () => {
    const { fetchImpl } = createPortal();
    const { authService, sessions } = createService(fetchImpl);

    const { authorizationUrl } = await authService.startSignIn();
    const state = new URL(authorizationUrl).searchParams.get('state')!;
    const { session } = await authService.completeSignIn('valid-code', state);

    // A new "request" reads the session from the store — the cookie is
    // all that travels between them.
    const restored = await sessions.get(session.id);
    expect(restored?.user.id).toBe('4711');
    expect(await authService.getUser(session.id)).not.toBeNull();
  });

  it('ends the session on sign-out', async () => {
    const { fetchImpl } = createPortal();
    const { authService } = createService(fetchImpl);

    const { authorizationUrl } = await authService.startSignIn();
    const state = new URL(authorizationUrl).searchParams.get('state')!;
    const { session } = await authService.completeSignIn('valid-code', state);

    await authService.signOut(session.id);
    expect(await authService.getUser(session.id)).toBeNull();
  });

  it('refuses to start a sign-in when the provider is not configured', async () => {
    const client = new AbcT2Client({
      config: { ...CONFIG, authorizationUrl: '' },
      fetchImpl: createPortal().fetchImpl,
    });
    const authService = new AuthService({
      client,
      sessions: new InMemorySessionStore(60_000),
    });

    await expect(authService.startSignIn()).rejects.toThrow(/not configured/);
  });
});
