import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AccessLog } from './audit.js';
import { EmployeeDirectory } from './directory.js';
import { hashPin } from './pin.js';
import { PinAuthService } from './pinService.js';
import { AttemptLimiter } from './rateLimit.js';
import { InMemorySessionStore, AuthService, AbcT2Client } from '@t2-sales-hub/core';
import type { AuthProviderConfig } from '@t2-sales-hub/core';

const CONFIG: AuthProviderConfig = {
  providerId: 'abc-t2',
  authorizationUrl: '',
  tokenUrl: '',
  userInfoUrl: '',
  clientId: '',
  clientSecret: '',
  redirectUri: '',
  scopes: [],
};

describe('PinAuthService', () => {
  let root: string;
  let directory: EmployeeDirectory;
  let service: PinAuthService;
  let log: AccessLog;
  let authService: AuthService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 't2-pin-'));

    directory = new EmployeeDirectory({ filePath: join(root, 'employees.json') });
    await directory.load();
    await directory.upsert({
      id: 'EMP-001',
      name: 'Иванова Пётр Петрович',
      office: 'Карла Маркса, 7',
      position: 'Продавец-консультант',
      roles: ['seller'],
      pinHash: hashPin('1234'),
      active: true,
    });

    log = new AccessLog(join(root, 'access-log.jsonl'));

    const client = new AbcT2Client({
      config: CONFIG,
      fetchImpl: (async () => new Response('{}', { status: 404 })) as unknown as typeof fetch,
    });
    authService = new AuthService({
      client,
      sessions: new InMemorySessionStore(60_000),
    });

    service = new PinAuthService({
      directory,
      accessLog: log,
      authService,
      limiter: new AttemptLimiter({ maxAttempts: 3, lockoutMs: 60_000 }),
    });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('signs a known employee in with the right PIN', async () => {
    const result = await service.signIn('Иванова Пётр Петрович', '1234', '10.0.0.1');

    expect(result.ok).toBe(true);
    expect(result.session?.user.displayName).toBe('Иванова Пётр Петрович');
    expect(result.session?.user.provider).toBe('pin');
    expect(result.session?.user.region).toBe('Карла Маркса, 7');
    expect(result.session?.user.roles).toEqual(['seller']);
  });

  it('finds the employee by name regardless of how it is written', async () => {
    const result = await service.signIn('  иванова  петр   ', '1234');

    expect(result.ok).toBe(true);
  });

  it('refuses a wrong PIN', async () => {
    const result = await service.signIn('Иванова Пётр Петрович', '9999');

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Неверное имя или ПИН.');
  });

  it('gives the same answer for an unknown name', async () => {
    const result = await service.signIn('Кто-то Другой', '1234');

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Неверное имя или ПИН.');
  });

  it('refuses an inactive employee', async () => {
    await directory.setActive('EMP-001', false);

    const result = await service.signIn('Иванова Пётр Петрович', '1234');

    expect(result.ok).toBe(false);
  });

  it('blocks after too many failures', async () => {
    await service.signIn('Иванова Пётр Петрович', '0000');
    await service.signIn('Иванова Пётр Петрович', '0000');
    const third = await service.signIn('Иванова Пётр Петрович', '0000');

    expect(third.lockedUntil).toBeDefined();

    // Even the right PIN is refused while the block lasts.
    const blocked = await service.signIn('Иванова Пётр Петрович', '1234');
    expect(blocked.ok).toBe(false);
  });

  it('clears the counter after a success', async () => {
    await service.signIn('Иванова Пётр Петрович', '0000');
    const result = await service.signIn('Иванова Пётр Петрович', '1234');

    expect(result.ok).toBe(true);
  });

  it('writes every attempt to the access log', async () => {
    await service.signIn('Иванова Пётр Петрович', '9999', '10.0.0.1');
    await service.signIn('Иванова Пётр Петрович', '1234', '10.0.0.1');

    const records = await log.read();
    expect(records.length).toBeGreaterThanOrEqual(2);
    expect(records[0]?.event).toBe('sign-in');
    expect(records[0]?.success).toBe(true);
    expect(records[0]?.ip).toBe('10.0.0.1');
  });

  it('never writes the PIN to the log', async () => {
    await service.signIn('Иванова Пётр Петрович', '1234');

    const records = await log.read();
    expect(JSON.stringify(records)).not.toContain('1234');
  });

  it('adds the role the environment grants by the name', async () => {
    const withAdmin = new PinAuthService({
      directory,
      accessLog: log,
      authService,
      limiter: new AttemptLimiter({ maxAttempts: 3, lockoutMs: 60_000 }),
      adminLogins: 'Иванова Пётр Петрович',
    });

    const result = await withAdmin.signIn('Иванова Пётр Петрович', '1234');

    expect(result.ok).toBe(true);
    expect(result.session?.user.roles).toContain('admin');
    // The role of the directory is kept.
    expect(result.session?.user.roles).toContain('seller');
  });

  it('does not give the role to somebody else', async () => {
    const withAdmin = new PinAuthService({
      directory,
      accessLog: log,
      authService,
      limiter: new AttemptLimiter({ maxAttempts: 3, lockoutMs: 60_000 }),
      adminLogins: 'Кто-то Другой',
    });

    const result = await withAdmin.signIn('Иванова Пётр Петрович', '1234');

    expect(result.session?.user.roles).not.toContain('admin');
  });
});
