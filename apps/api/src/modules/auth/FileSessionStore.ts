/**
 * A session store that survives a restart of the API.
 *
 * The requirement behind it is simple: a seller signs in through the
 * ABC T2 portal once, and the application does not ask again — not
 * after closing the browser, and not after the server was restarted or
 * redeployed.
 *
 * The file is encrypted with AES-256-GCM. A session carries the
 * provider's access and refresh tokens, and those must not sit on disk
 * in plain text. The key is derived from `AUTH_COOKIE_SECRET`, so
 * rotating the secret invalidates the stored sessions as well — that
 * is the intended behaviour.
 *
 * The store keeps the sessions in memory and mirrors them to disk, so
 * the read path stays fast and the file is only a backup of the truth.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { AuthSession, AuthUser } from '@t2-sales-hub/core';
import type { SessionStore } from '@t2-sales-hub/core';

const ALGORITHM = 'aes-256-gcm';
const FILE_VERSION = 1;

interface StoredFile {
  version: number;
  sessions: AuthSession[];
}

export interface FileSessionStoreOptions {
  /** Where the encrypted file lives. */
  filePath: string;
  /** The secret the encryption key is derived from. */
  secret: string;
  /** How long a session stays valid. */
  ttlMs?: number;
  /** How long to wait before writing, in milliseconds. */
  flushDelayMs?: number;
  now?: () => Date;
}

export class FileSessionStore implements SessionStore {
  private sessions = new Map<string, AuthSession>();
  private readonly filePath: string;
  private readonly key: Buffer;
  private readonly ttlMs: number;
  private readonly flushDelayMs: number;
  private readonly now: () => Date;
  private flushTimer: NodeJS.Timeout | undefined;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(options: FileSessionStoreOptions) {
    this.filePath = options.filePath;
    this.key = deriveKey(options.secret);
    this.ttlMs = options.ttlMs ?? 30 * 24 * 60 * 60 * 1000;
    this.flushDelayMs = options.flushDelayMs ?? 250;
    this.now = options.now ?? (() => new Date());
  }

  /**
   * Reads the file and restores the sessions.
   *
   * A missing file is a normal first start. A file that cannot be
   * decrypted — the secret was rotated, or the file is damaged — is
   * not a reason to take the service down: the file is set aside and
   * the store starts empty. The seller signs in again, and the service
   * stays up.
   *
   * @returns how many sessions were restored.
   */
  async init(): Promise<number> {
    if (!existsSync(this.filePath)) return 0;

    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (error) {
      console.warn(
        `[auth] The session file ${this.filePath} could not be read, starting without sessions:`,
        error
      );
      return 0;
    }

    if (!raw.trim()) return 0;

    let sessions: AuthSession[];
    try {
      sessions = this.decrypt(raw);
    } catch (error) {
      // The most likely cause is a rotated AUTH_COOKIE_SECRET. The old
      // file is kept aside rather than deleted — it may still be useful
      // for a look at what happened.
      const backupPath = `${this.filePath}.unreadable`;
      console.warn(
        `[auth] The session file ${this.filePath} could not be decrypted, starting without sessions:`,
        error
      );
      try {
        await rename(this.filePath, backupPath);
        console.warn(`[auth] The old file was moved to ${backupPath}`);
      } catch {
        // The file stays where it is; it is overwritten on the next write.
      }
      return 0;
    }

    let restored = 0;
    for (const session of sessions) {
      // Expired sessions are dropped instead of being restored.
      if (Date.parse(session.expiresAt) > this.now().getTime()) {
        this.sessions.set(session.id, session);
        restored += 1;
      }
    }
    return restored;
  }

  /** Decrypts the payload of the session file. */
  private decrypt(raw: string): AuthSession[] {
    const parsed = JSON.parse(raw) as {
      version?: number;
      iv?: string;
      tag?: string;
      data?: string;
    };

    if (parsed.version !== FILE_VERSION || !parsed.iv || !parsed.data) {
      throw new Error(
        `Session file ${this.filePath} has an unsupported format and cannot be restored`
      );
    }

    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(parsed.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(parsed.tag ?? '', 'base64'));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(parsed.data, 'base64')),
      decipher.final(),
    ]).toString('utf8');

    const stored = JSON.parse(plaintext) as StoredFile;
    return stored.sessions;
  }

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
      id: randomBytes(24).toString('base64url'),
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
    this.scheduleFlush();
    return session;
  }

  async get(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (Date.parse(session.expiresAt) <= this.now().getTime()) {
      this.sessions.delete(sessionId);
      this.scheduleFlush();
      return null;
    }
    return session;
  }

  async update(sessionId: string, patch: Partial<AuthSession>): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const updated = { ...session, ...patch };
    this.sessions.set(sessionId, updated);
    this.scheduleFlush();
    return updated;
  }

  async destroy(sessionId: string): Promise<void> {
    if (this.sessions.delete(sessionId)) {
      this.scheduleFlush();
    }
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

    if (removed > 0) this.scheduleFlush();
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

  /**
   * Writes the sessions to disk immediately.
   *
   * A pending scheduled write is executed rather than dropped — the
   * caller asked for the state to be on disk now.
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
      this.writeChain = this.writeChain
        .then(() => this.write())
        .catch(() => {
          // A failed write must not break the caller.
        });
    }
    await this.writeChain;
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      this.writeChain = this.writeChain
        .then(() => this.write())
        .catch(() => {
          // A failed write must not break the request that triggered it.
        });
    }, this.flushDelayMs);
    this.flushTimer.unref?.();
  }

  private async write(): Promise<void> {
    const stored: StoredFile = {
      version: FILE_VERSION,
      sessions: Array.from(this.sessions.values()),
    };

    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const plaintext = Buffer.from(JSON.stringify(stored), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

    const payload = {
      version: FILE_VERSION,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: encrypted.toString('base64'),
    };

    await mkdir(dirname(this.filePath), { recursive: true });

    // Write to a temporary file and rename: a crash mid-write must not
    // leave a half-written session file behind.
    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(payload), 'utf8');
    await rename(temporaryPath, this.filePath);
  }
}

/** Derives a 32-byte key from the secret. */
function deriveKey(secret: string): Buffer {
  return scryptSync(secret, 't2-sales-hub/sessions', 32);
}
