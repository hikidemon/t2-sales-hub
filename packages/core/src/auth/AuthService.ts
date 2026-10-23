/**
 * Authentication service.
 *
 * Owns the sign-in flow: the pending attempt (state + PKCE), the
 * exchange of the code, the session and the profile.
 *
 * The pending attempts live in memory for a few minutes — they are
 * only needed between the redirect to the portal and the callback.
 */

import type { AuthProviderConfig, AuthSession, AuthUser } from '../domain/auth.js';
import type { AbcT2Client, PkcePair } from './AbcT2Client.js';
import { AuthError, createPkcePair } from './AbcT2Client.js';
import type { SessionStore } from './SessionStore.js';

/** A sign-in attempt waiting for the callback. */
interface PendingAttempt {
  state: string;
  pkce: PkcePair;
  createdAt: number;
  /** Where to send the user afterwards. */
  returnTo?: string;
}

export interface AuthServiceOptions {
  client: AbcT2Client;
  sessions: SessionStore;
  /** How long a pending attempt stays valid, in milliseconds. */
  pendingTtlMs?: number;
  now?: () => Date;
}

/** The result of starting a sign-in. */
export interface StartSignInResult {
  /** The URL the browser must be sent to. */
  authorizationUrl: string;
  /** The CSRF state of this attempt. */
  state: string;
}

export class AuthService {
  private readonly pending = new Map<string, PendingAttempt>();
  private readonly pendingTtlMs: number;
  private readonly now: () => Date;

  constructor(private readonly options: AuthServiceOptions) {
    this.pendingTtlMs = options.pendingTtlMs ?? 10 * 60 * 1000;
    this.now = options.now ?? (() => new Date());
  }

  /** True when the provider is configured enough to sign in. */
  isConfigured(): boolean {
    return this.options.client.isConfigured();
  }

  /**
   * Starts a sign-in: creates the CSRF state and the PKCE pair and
   * returns the URL of the ABC T2 portal.
   */
  async startSignIn(returnTo?: string): Promise<StartSignInResult> {
    if (!this.isConfigured()) {
      throw new AuthError(
        'ABC T2 is not configured — set the ABC_T2_* environment variables',
        'not_configured'
      );
    }

    const pkce = await createPkcePair();
    const state = `${pkce.verifier.slice(0, 16)}.${Date.now().toString(36)}`;

    this.pending.set(state, { state, pkce, createdAt: this.now().getTime(), returnTo });
    this.prunePending();

    return {
      authorizationUrl: this.options.client.buildAuthorizationUrl(state, pkce),
      state,
    };
  }

  /**
   * Completes a sign-in.
   *
   * The `state` is checked against the pending attempts: a callback
   * with an unknown state is rejected, so a forged callback cannot
   * attach someone else's account.
   */
  async completeSignIn(
    code: string,
    state: string,
    error?: string
  ): Promise<{ session: AuthSession; returnTo?: string }> {
    if (error) {
      throw new AuthError(`The portal reported: ${error}`, 'denied');
    }

    const attempt = this.pending.get(state);
    this.pending.delete(state);

    if (!attempt) {
      throw new AuthError('Unknown or expired sign-in state', 'invalid_state');
    }

    if (this.now().getTime() - attempt.createdAt > this.pendingTtlMs) {
      throw new AuthError('The sign-in attempt expired', 'invalid_state');
    }

    const { user, tokens } = await this.options.client.completeSignIn(code, attempt.pkce);

    const session = await this.options.sessions.create(user, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: this.options.client.accessTokenExpiresAt(tokens.expiresIn),
    });

    return { session, returnTo: attempt.returnTo };
  }

  /** The session behind a cookie value, if it is still valid. */
  async getSession(sessionId: string | undefined): Promise<AuthSession | null> {
    if (!sessionId) return null;
    return this.options.sessions.get(sessionId);
  }

  /** The user behind a cookie value. */
  async getUser(sessionId: string | undefined): Promise<AuthUser | null> {
    const session = await this.getSession(sessionId);
    return session?.user ?? null;
  }

  /**
   * Replaces the profile stored in the session.
   *
   * Used when the environment grants a role on top of the one the
   * portal issued.
   */
  async updateSessionUser(sessionId: string, user: AuthUser): Promise<AuthSession | null> {
    return this.options.sessions.update(sessionId, { user });
  }

  /** Ends a session. */
  async signOut(sessionId: string | undefined): Promise<void> {
    if (!sessionId) return;
    await this.options.sessions.destroy(sessionId);
  }

  /**
   * Creates a session for a user authenticated by the application
   * itself — the fallback provider, not the corporate portal.
   *
   * The session is the same as after a portal sign-in: the browser
   * still only receives an opaque cookie.
   */
  async createLocalSession(user: AuthUser): Promise<AuthSession> {
    return this.options.sessions.create(user, {});
  }

  /**
   * Renews the provider token when it has expired.
   *
   * The session survives: the seller does not have to sign in again
   * just because the provider's access token expired.
   */
  async refreshSession(session: AuthSession): Promise<AuthSession> {
    if (!session.refreshToken) {
      return session;
    }

    const expiresAt = session.accessTokenExpiresAt
      ? Date.parse(session.accessTokenExpiresAt)
      : Number.POSITIVE_INFINITY;

    if (expiresAt > this.now().getTime() + 60_000) {
      return session;
    }

    try {
      const tokens = await this.options.client.refreshAccessToken(session.refreshToken);
      const updated = await this.options.sessions.update(session.id, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? session.refreshToken,
        accessTokenExpiresAt: this.options.client.accessTokenExpiresAt(tokens.expiresIn),
      });
      return updated ?? session;
    } catch {
      // The refresh token is no longer valid — the session must end.
      await this.options.sessions.destroy(session.id);
      throw new AuthError('The session could not be renewed', 'token_exchange_failed');
    }
  }

  private prunePending(): void {
    const cutoff = this.now().getTime() - this.pendingTtlMs;
    for (const [state, attempt] of this.pending) {
      if (attempt.createdAt < cutoff) {
        this.pending.delete(state);
      }
    }
  }
}

/** Builds the provider configuration from the environment. */
export function buildAbcT2Config(env: {
  ABC_T2_AUTHORIZATION_URL?: string;
  ABC_T2_TOKEN_URL?: string;
  ABC_T2_USER_INFO_URL?: string;
  ABC_T2_CLIENT_ID?: string;
  ABC_T2_CLIENT_SECRET?: string;
  ABC_T2_REDIRECT_URI?: string;
  ABC_T2_SCOPES?: string;
  ABC_T2_TOKEN_AUTH_METHOD?: 'client_secret_post' | 'client_secret_basic';
}): AuthProviderConfig {
  return {
    providerId: 'abc-t2',
    authorizationUrl: env.ABC_T2_AUTHORIZATION_URL ?? '',
    tokenUrl: env.ABC_T2_TOKEN_URL ?? '',
    userInfoUrl: env.ABC_T2_USER_INFO_URL ?? '',
    clientId: env.ABC_T2_CLIENT_ID ?? '',
    clientSecret: env.ABC_T2_CLIENT_SECRET ?? '',
    redirectUri: env.ABC_T2_REDIRECT_URI ?? '',
    scopes: (env.ABC_T2_SCOPES ?? '').split(/[\s,]+/).filter(Boolean),
    tokenAuthMethod: env.ABC_T2_TOKEN_AUTH_METHOD ?? 'client_secret_post',
  };
}
