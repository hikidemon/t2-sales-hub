import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { AuthUser } from '@t2-sales-hub/core';

import { FileSessionStore } from './FileSessionStore.js';

const SECRET = 'a-secret-long-enough-for-tests';
const USER: AuthUser = {
  id: '4711',
  provider: 'abc-t2',
  displayName: 'Иванова Пётр Петрович',
  login: 'i.petrova',
  email: 'i.petrova@t2.ru',
  position: 'Продавец-консультант',
  region: 'Новосибирск',
  roles: ['seller'],
};

async function withTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 't2-sessions-'));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('FileSessionStore', () => {
  it('keeps the session across a restart of the API', async () => {
    await withTempDir(async (dir) => {
      const filePath = join(dir, 'sessions.json');

      const first = new FileSessionStore({ filePath, secret: SECRET });
      await first.init();

      const session = await first.create(USER, {
        accessToken: 'access-abc-123',
        refreshToken: 'refresh-abc-456',
      });

      await first.flush();

      // A new instance — the state after the API was restarted.
      const second = new FileSessionStore({ filePath, secret: SECRET });
      await second.init();

      const restored = await second.get(session.id);
      expect(restored).not.toBeNull();
      expect(restored?.user.id).toBe('4711');
      expect(restored?.user.displayName).toBe('Иванова Пётр Петрович');
      expect(restored?.accessToken).toBe('access-abc-123');
      expect(restored?.refreshToken).toBe('refresh-abc-456');
    });
  });

  it('does not store the tokens in plain text', async () => {
    await withTempDir(async (dir) => {
      const filePath = join(dir, 'sessions.json');

      const store = new FileSessionStore({ filePath, secret: SECRET });
      await store.init();
      await store.create(USER, {
        accessToken: 'access-abc-123',
        refreshToken: 'refresh-abc-456',
      });
      await store.flush();

      const raw = await readFile(filePath, 'utf8');
      expect(raw).not.toContain('access-abc-123');
      expect(raw).not.toContain('refresh-abc-456');
      expect(raw).not.toContain('i.petrova@t2.ru');
    });
  });

  it('starts without sessions when the secret was rotated', async () => {
    await withTempDir(async (dir) => {
      const filePath = join(dir, 'sessions.json');

      const store = new FileSessionStore({ filePath, secret: SECRET });
      await store.init();
      await store.create(USER, { accessToken: 'access-abc-123' });
      await store.flush();

      // The secret was rotated — the file cannot be read any more.
      const other = new FileSessionStore({
        filePath,
        secret: 'a-different-secret-value-000',
      });

      // The service must stay up.
      await expect(other.init()).resolves.toBe(0);
      expect(await other.get('anything')).toBeNull();
    });
  });

  it('keeps the unreadable file aside instead of deleting it', async () => {
    await withTempDir(async (dir) => {
      const filePath = join(dir, 'sessions.json');

      const store = new FileSessionStore({ filePath, secret: SECRET });
      await store.init();
      await store.create(USER, { accessToken: 'access-abc-123' });
      await store.flush();

      const other = new FileSessionStore({
        filePath,
        secret: 'a-different-secret-value-000',
      });
      await other.init();

      await expect(readFile(`${filePath}.unreadable`, 'utf8')).resolves.toContain('version');
    });
  });

  it('starts empty when there is no file yet', async () => {
    await withTempDir(async (dir) => {
      const store = new FileSessionStore({
        filePath: join(dir, 'missing', 'sessions.json'),
        secret: SECRET,
      });

      await expect(store.init()).resolves.toBe(0);
      expect(await store.get('anything')).toBeNull();
    });
  });

  it('ends a session on sign-out', async () => {
    await withTempDir(async (dir) => {
      const filePath = join(dir, 'sessions.json');

      const store = new FileSessionStore({ filePath, secret: SECRET });
      await store.init();

      const session = await store.create(USER, {});
      await store.destroy(session.id);
      await store.flush();

      const restarted = new FileSessionStore({ filePath, secret: SECRET });
      await restarted.init();
      expect(await restarted.get(session.id)).toBeNull();
    });
  });

  it('does not restore an expired session', async () => {
    await withTempDir(async (dir) => {
      const filePath = join(dir, 'sessions.json');

      const store = new FileSessionStore({ filePath, secret: SECRET });
      await store.init();

      const session = await store.create(USER, {});
      await store.flush();

      // The clock moved past the expiry.
      const later = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
      const restarted = new FileSessionStore({
        filePath,
        secret: SECRET,
        now: () => later,
      });
      await restarted.init();

      expect(await restarted.get(session.id)).toBeNull();
    });
  });
});
