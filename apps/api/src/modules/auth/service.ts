/**
 * Wires the authentication service.
 *
 * Everything the flow needs — the provider client, the session store,
 * the employee directory and the services around them — is built here,
 * so the rest of the application only receives ready objects.
 */

import {
  AbcT2Client,
  AuthService,
  InMemorySessionStore,
  buildAbcT2Config,
} from '@t2-sales-hub/core';

import { env } from '../../shared/config/env.js';
import { resolveDataPath } from '../../shared/config/paths.js';
import { AccessLog } from './audit.js';
import { EmployeeDirectory } from './directory.js';
import { FileSessionStore } from './FileSessionStore.js';
import { PinAuthService } from './pinService.js';
import { AttemptLimiter } from './rateLimit.js';

export interface AuthSetup {
  authService: AuthService;
  sessions: InMemorySessionStore | FileSessionStore;
  directory: EmployeeDirectory;
  accessLog: AccessLog;
  pinService: PinAuthService;
  /** The sign-in methods the client may offer. */
  methods: string[];
}

/** The sign-in methods enabled in the environment. */
export function enabledAuthMethods(): string[] {
  return env.AUTH_METHODS.split(',')
    .map((method) => method.trim())
    .filter(Boolean);
}

/** Builds the authentication service from the environment. */
export function createAuthSetup(fetchImpl?: typeof fetch): AuthSetup {
  const config = buildAbcT2Config(env);

  const client = new AbcT2Client({
    config,
    ...(fetchImpl ? { fetchImpl } : {}),
  });

  const ttlMs = env.AUTH_SESSION_TTL_HOURS * 60 * 60 * 1000;

  // The file store keeps the sessions across a restart of the API — the
  // seller signs in once and stays signed in.
  const sessions =
    env.AUTH_SESSION_STORE === 'file'
      ? new FileSessionStore({
          filePath: resolveDataPath(env.AUTH_SESSION_FILE),
          secret: env.AUTH_COOKIE_SECRET ?? 't2-sales-hub-development-secret',
          ttlMs,
        })
      : new InMemorySessionStore(ttlMs);

  const authService = new AuthService({ client, sessions });

  const directory = new EmployeeDirectory({
    filePath: resolveDataPath(env.AUTH_DIRECTORY_FILE),
  });
  const accessLog = new AccessLog(resolveDataPath(env.AUTH_ACCESS_LOG));
  const limiter = new AttemptLimiter({
    maxAttempts: env.AUTH_PIN_MAX_ATTEMPTS,
    lockoutMs: env.AUTH_PIN_LOCKOUT_MINUTES * 60 * 1000,
  });

  const pinService = new PinAuthService({
    directory,
    limiter,
    accessLog,
    authService,
    adminLogins: env.AUTH_ADMIN_LOGINS,
    curatorLogins: env.AUTH_CURATOR_LOGINS,
  });

  return {
    authService,
    sessions,
    directory,
    accessLog,
    pinService,
    methods: enabledAuthMethods(),
  };
}
