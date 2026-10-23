/**
 * The access log.
 *
 * Every sign-in attempt — successful or not — leaves a record. For a
 * cabinet with salary data this is not optional: an administrator has
 * to be able to answer "who entered and when".
 *
 * The log is append-only JSON Lines in `.data/`, which is git-ignored.
 * It holds no secrets: the PIN is never written, only the fact of the
 * attempt and its outcome.
 */

import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

/** What happened. */
export type AccessEvent = 'sign-in' | 'sign-in-failed' | 'sign-out' | 'locked' | 'session-restored';

export interface AccessRecord {
  /** ISO timestamp of the event. */
  at: string;
  /** What happened. */
  event: AccessEvent;
  /** The provider that handled the attempt. */
  provider: string;
  /** Who tried to sign in. Never a secret. */
  identifier: string;
  /** Whether the attempt succeeded. */
  success: boolean;
  /** The address the attempt came from. */
  ip?: string;
  /** A short explanation. */
  reason?: string;
  /** The role the person got, when the sign-in succeeded. */
  role?: string;
}

export class AccessLog {
  constructor(private readonly filePath: string) {}

  /** Appends a record. A failed write must not break the request. */
  async write(record: Omit<AccessRecord, 'at'>): Promise<void> {
    const entry: AccessRecord = { at: new Date().toISOString(), ...record };

    try {
      await mkdir(dirname(this.filePath), { recursive: true });
      await appendFile(this.filePath, `${JSON.stringify(entry)}\n`, 'utf8');
    } catch {
      // The log is important, but a failure to write it must not take
      // the sign-in down. The error is visible in the service log.
      console.warn('[auth] The access record could not be written');
    }
  }

  /** Reads the last records — for the administrator's page. */
  async read(limit = 100): Promise<AccessRecord[]> {
    try {
      const { readFile } = await import('node:fs/promises');
      const raw = await readFile(this.filePath, 'utf8');
      const lines = raw.split('\n').filter(Boolean);
      return lines
        .slice(-limit)
        .reverse()
        .map((line) => {
          try {
            return JSON.parse(line) as AccessRecord;
          } catch {
            return null;
          }
        })
        .filter((record): record is AccessRecord => record !== null);
    } catch {
      return [];
    }
  }
}
