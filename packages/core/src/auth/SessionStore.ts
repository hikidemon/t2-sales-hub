/**
 * Session store.
 *
 * Sessions live on the server; the browser only holds an opaque cookie.
 * That is what makes "sign in once" work: closing the browser does not
 * end the session, and the access token of the provider never reaches
 * the client.
 *
 * The in-memory implementation is enough for a demo and for tests. A
 * persistent implementation (file, Redis, database) can be substituted
 * without touching the callers.
 */

import type { AuthSession, AuthUser } from '../domain/auth.js';

export interface SessionStore {
  create(
    user: AuthUser,
    tokens: {
      accessToken?: string;
      refreshToken?: string;
      accessTokenExpiresAt?: string;
    }
  ): Promise<AuthSession>;
  get(sessionId: string): Promise<AuthSession | null>;
  update(sessionId: string, patch: Partial<AuthSession>): Promise<AuthSession | null>;
  destroy(sessionId: string): Promise<void>;
  /** Removes expired sessions. Returns how many were removed. */
  pruneExpired(): Promise<number>;
  /** The session of a user, if several are open. */
  findByUser(provider: string, userId: string): Promise<AuthSession | null>;
}

/** How long a session stays valid by default. */
export const DEFAULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Sessions are keyed by a random identifier. */
export class InMemorySessionStore implements SessionStore {
  private sessions = new Map<string, AuthSession>();

  constructor(
    private readonly ttlMs: number = DEFAULT_SESSION_TTL_MS,
    private readonly now: () => Date = () => new Date()
  ) {}

  async create(
    user: AuthUser,
    tokens: {
      accessToken?: string;
      refreshToken?: string;
      accessTokenExpiresAt?: string;
    }
  ): Promise<AuthSession> {
    const createdAt = this.now();
    const session: AuthSession = {
      id: this.generateId(),
      userId: user.id,
      provider: user.provider,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + this.ttlMs).toISOString(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      user,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async get(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (Date.parse(session.expiresAt) <= this.now().getTime()) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  async update(sessionId: string, patch: Partial<AuthSession>): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const updated = { ...session, ...patch };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async destroy(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async pruneExpired(): Promise<number> {
    const now = this.now().getTime();
    let removed = 0;

    for (const [id, session] of this.sessions) {
      if (Date.parse(session.expiresAt) <= now) {
        this.sessions.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  async findByUser(provider: string, userId: string): Promise<AuthSession | null> {
    for (const session of this.sessions.values()) {
      if (session.provider === provider && session.userId === userId) {
        if (Date.parse(session.expiresAt) > this.now().getTime()) {
          return session;
        }
      }
    }
    return null;
  }

  private generateId(): string {
    const globalCrypto = globalThis.crypto;
    if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
      return globalCrypto.randomUUID();
    }
    return `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}
