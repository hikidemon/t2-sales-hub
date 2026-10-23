/**
 * OAuth 2.0 client for the ABC T2 portal.
 *
 * Implements the Authorization Code flow with PKCE, so the flow works
 * even when the provider treats the client as a public one. The
 * client secret is still sent when the provider requires it.
 *
 * The endpoints are configuration, not constants: the exact addresses
 * of the ABC T2 portal are supplied through the environment once the
 * access is granted.
 */

import type {
  AuthUser,
  AuthProviderConfig,
  OAuthTokenResponse,
  SignInResult,
  UserRole,
} from '../domain/auth.js';

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code:
      'not_configured' | 'invalid_state' | 'token_exchange_failed' | 'profile_failed' | 'denied'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/** PKCE pair for one authorisation attempt. */
export interface PkcePair {
  verifier: string;
  challenge: string;
  method: 'S256' | 'plain';
}

/** Generates a PKCE verifier and its S256 challenge. */
export async function createPkcePair(): Promise<PkcePair> {
  const verifier = randomToken(64);
  const digest = await sha256(verifier);
  return { verifier, challenge: base64Url(digest), method: 'S256' };
}

/** A random URL-safe token. */
export function randomToken(bytes = 32): string {
  const globalCrypto = globalThis.crypto;
  const buffer = new Uint8Array(bytes);
  globalCrypto.getRandomValues(buffer);
  return base64Url(buffer);
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 =
    typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(value: string): Promise<Uint8Array> {
  const globalCrypto = globalThis.crypto;
  const data = new TextEncoder().encode(value);
  const digest = await globalCrypto.subtle.digest('SHA-256', data);
  return new Uint8Array(digest);
}

export interface AbcT2ClientOptions {
  config: AuthProviderConfig;
  fetchImpl?: typeof fetch;
  /** Overrides the clock, used in tests. */
  now?: () => Date;
}

/**
 * The ABC T2 OAuth client.
 *
 * Everything the provider returns is normalised into `AuthUser`, so the
 * rest of the application never depends on the portal's field names.
 */
export class AbcT2Client {
  private readonly config: AuthProviderConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(options: AbcT2ClientOptions) {
    this.config = options.config;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.now = options.now ?? (() => new Date());
  }

  /** True when the provider is configured enough to attempt a sign-in. */
  isConfigured(): boolean {
    return Boolean(
      this.config.authorizationUrl &&
      this.config.tokenUrl &&
      this.config.userInfoUrl &&
      this.config.clientId
    );
  }

  /**
   * Builds the URL the browser is sent to.
   *
   * @param state  CSRF token echoed back by the provider.
   * @param pkce   The PKCE pair of this attempt.
   */
  buildAuthorizationUrl(state: string, pkce: PkcePair): string {
    const url = new URL(this.config.authorizationUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', pkce.challenge);
    url.searchParams.set('code_challenge_method', pkce.method);
    if (this.config.scopes.length > 0) {
      url.searchParams.set('scope', this.config.scopes.join(' '));
    }
    return url.toString();
  }

  /**
   * Exchanges the authorization code for a token and reads the profile.
   */
  async completeSignIn(code: string, pkce: PkcePair): Promise<SignInResult> {
    const tokens = await this.exchangeCode(code, pkce);
    const user = await this.fetchProfile(tokens.accessToken);
    return { user, tokens };
  }

  /** Exchanges the authorization code for a token. */
  async exchangeCode(code: string, pkce: PkcePair): Promise<OAuthTokenResponse> {
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('redirect_uri', this.config.redirectUri);
    body.set('client_id', this.config.clientId);
    body.set('code_verifier', pkce.verifier);

    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    };

    if (this.config.tokenAuthMethod !== 'client_secret_basic') {
      body.set('client_secret', this.config.clientSecret);
    } else {
      headers.authorization = `Basic ${base64Url(
        new TextEncoder().encode(`${this.config.clientId}:${this.config.clientSecret}`)
      )}`;
    }

    let response: Response;
    try {
      response = await this.fetchImpl(this.config.tokenUrl, {
        method: 'POST',
        headers,
        body: body.toString(),
      });
    } catch (error) {
      throw new AuthError(
        `Token endpoint unreachable: ${(error as Error).message}`,
        'token_exchange_failed'
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new AuthError(
        `Token exchange failed with ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
        'token_exchange_failed'
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const accessToken = payload.access_token;
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new AuthError(
        'Token response did not contain an access token',
        'token_exchange_failed'
      );
    }

    return {
      accessToken,
      refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined,
      expiresIn: typeof payload.expires_in === 'number' ? payload.expires_in : undefined,
      tokenType: typeof payload.token_type === 'string' ? payload.token_type : undefined,
      idToken: typeof payload.id_token === 'string' ? payload.id_token : undefined,
      scope: typeof payload.scope === 'string' ? payload.scope : undefined,
    };
  }

  /** Renews an access token with the refresh token. */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', refreshToken);
    body.set('client_id', this.config.clientId);

    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    };
    if (this.config.tokenAuthMethod !== 'client_secret_basic') {
      body.set('client_secret', this.config.clientSecret);
    } else {
      headers.authorization = `Basic ${base64Url(
        new TextEncoder().encode(`${this.config.clientId}:${this.config.clientSecret}`)
      )}`;
    }

    const response = await this.fetchImpl(this.config.tokenUrl, {
      method: 'POST',
      headers,
      body: body.toString(),
    });

    if (!response.ok) {
      throw new AuthError(`Token refresh failed with ${response.status}`, 'token_exchange_failed');
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const accessToken = payload.access_token;
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new AuthError(
        'Refresh response did not contain an access token',
        'token_exchange_failed'
      );
    }

    return {
      accessToken,
      refreshToken:
        typeof payload.refresh_token === 'string' ? payload.refresh_token : refreshToken,
      expiresIn: typeof payload.expires_in === 'number' ? payload.expires_in : undefined,
    };
  }

  /** Reads the profile of the signed-in user. */
  async fetchProfile(accessToken: string): Promise<AuthUser> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.config.userInfoUrl, {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: 'application/json',
        },
      });
    } catch (error) {
      throw new AuthError(
        `Profile endpoint unreachable: ${(error as Error).message}`,
        'profile_failed'
      );
    }

    if (!response.ok) {
      throw new AuthError(`Profile request failed with ${response.status}`, 'profile_failed');
    }

    const payload = (await response.json()) as Record<string, unknown>;
    return normalizeAbcT2User(payload);
  }

  /** Expiry of an access token issued now. */
  accessTokenExpiresAt(expiresInSeconds?: number): string | undefined {
    if (!expiresInSeconds) return undefined;
    return new Date(this.now().getTime() + expiresInSeconds * 1000).toISOString();
  }
}

/**
 * Normalises the ABC T2 profile payload.
 *
 * The provider is `auth.t2.ru` (IdentityServer). The claims it declares:
 * `sub`, `name`, `given_name`, `family_name`, `preferred_username`,
 * `email`, `role`, `PersonID`, `OfficesIDs`, `MainOfficeID`, `permissions`.
 *
 * Several spellings are accepted so that the mapping keeps working if
 * the scope changes. Everything that is not recognised is kept in `raw`,
 * so nothing is lost.
 */
export function normalizeAbcT2User(payload: Record<string, unknown>): AuthUser {
  const pick = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      if (typeof value === 'number') {
        return String(value);
      }
    }
    return undefined;
  };

  const id =
    pick('sub', 'PersonID', 'id', 'user_id', 'userId', 'sysId') ??
    pick('preferred_username', 'login', 'username') ??
    'unknown';

  const displayName =
    pick('display_name', 'displayName', 'full_name', 'fullName', 'name', 'fio') ??
    pick('preferred_username', 'login', 'username') ??
    'Пользователь ABC T2';

  const rawRoles = payload.roles ?? payload.role ?? payload.groups;

  return {
    id,
    provider: 'abc-t2',
    displayName,
    login: pick('preferred_username', 'login', 'username', 'login_name'),
    email: pick('email', 'mail', 'email_address'),
    position: pick('position', 'job_title', 'jobTitle', 'title', 'role_name', 'position_name'),
    region: pick(
      'region',
      'region_name',
      'regionName',
      'MainOfficeID',
      'OfficesIDs',
      'city',
      'area',
      'retail_point',
      'store',
      'shop'
    ),
    roles: normalizeRoles(rawRoles),
    avatarUrl: pick('avatar', 'avatar_url', 'avatarUrl', 'picture', 'photo'),
    raw: payload,
  };
}

const KNOWN_ROLES: UserRole[] = ['seller', 'curator', 'manager', 'admin'];

/** Maps the provider's role names onto the application's roles. */
export function normalizeRoles(value: unknown): UserRole[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,\s]+/) : [];

  const roles: UserRole[] = [];

  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim().toLowerCase();
    if (!normalized) continue;

    const match = KNOWN_ROLES.find((role) => normalized.includes(role));
    if (match && !roles.includes(match)) {
      roles.push(match);
    }
  }

  // A user with no recognised role is treated as a seller — the base
  // role of the personal account.
  if (roles.length === 0) {
    roles.push('seller');
  }
  return roles;
}
