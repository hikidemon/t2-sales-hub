import express from 'express';

import type {
  AuthService,
  DataSyncService,
  ExternalSystemAdapter,
  ExternalSystemKind,
} from '@t2-sales-hub/core';

import { authContext } from './modules/auth/context.js';
import { createPinAuthRouter } from './modules/auth/pinRouter.js';
import {
  createAuthRouter,
  readSessionId,
  sessionCookieMaxAge,
  sessionCookieOptions,
} from './modules/auth/router.js';
import { createDashboardRouter } from './modules/dashboard/router.js';
import { healthRouter } from './modules/health/router.js';
import { createIntegrationRouter } from './modules/integrations/router.js';
import { createNotificationRouter } from './modules/notifications/router.js';
import type { NotificationService } from './modules/notifications/service.js';
import { createSyncRouter } from './modules/sync/router.js';
import { createTestRouter } from './modules/tests/router.js';
import type { QuizService } from './modules/tests/service.js';
import { signSessionId } from './modules/auth/cookie.js';
import { clearCookie, writeCookie } from './modules/auth/cookies.js';
import type { AccessLog } from './modules/auth/audit.js';
import type { EmployeeDirectory } from './modules/auth/directory.js';
import type { PinAuthService } from './modules/auth/pinService.js';
import { env } from './shared/config/env.js';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler.js';
import { sellerContext } from './shared/middleware/sellerContext.js';

export interface AppServices {
  syncService: DataSyncService;
  notificationService: NotificationService;
  quizService: QuizService;
  integrationAdapters: Map<ExternalSystemKind, ExternalSystemAdapter>;
  authService: AuthService;
  /** The employee directory of the fallback sign-in. */
  directory?: EmployeeDirectory;
  /** The sign-in service of the fallback provider. */
  pinService?: PinAuthService;
  /** The access log. */
  accessLog?: AccessLog;
  /** The sign-in methods the client may offer. */
  authMethods?: string[];
}

/**
 * Builds the Express application. Kept separate from `main.ts`
 * so tests can mount the app without binding a port.
 */
export function createApp(services: AppServices): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // The signed-in user is resolved from the session cookie, server-side.
  app.use(
    authContext({
      authService: services.authService,
      readSessionId,
    })
  );

  // The acting seller is resolved on the server, never taken from the request.
  app.use(sellerContext());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', createAuthRouter(services.authService));

  // The fallback sign-in and the management of the employee directory.
  if (services.pinService && services.directory && services.accessLog) {
    app.use(
      '/api/auth',
      createPinAuthRouter({
        authService: services.authService,
        directory: services.directory,
        pinService: services.pinService,
        accessLog: services.accessLog,
        methods: services.authMethods ?? ['pin'],
        cookieOptions: sessionCookieOptions(),
        cookieMaxAge: sessionCookieMaxAge(),
        cookieSecret: env.AUTH_COOKIE_SECRET ?? '',
        setSessionCookie: (res, sessionId) => {
          const secret = env.AUTH_COOKIE_SECRET;
          if (!secret) {
            // Without a secret the cookie cannot be signed — refuse
            // rather than hand out an unsigned session.
            throw new Error('AUTH_COOKIE_SECRET is not configured');
          }
          writeCookie(res, env.AUTH_COOKIE_NAME, signSessionId(sessionId, secret), {
            ...sessionCookieOptions(),
            maxAge: sessionCookieMaxAge(),
          });
        },
        clearSessionCookie: (res) => {
          clearCookie(res, env.AUTH_COOKIE_NAME, sessionCookieOptions());
        },
      })
    );
  }

  app.use('/api/dashboard', createDashboardRouter(services.syncService));
  app.use('/api/sync', createSyncRouter(services.syncService));
  app.use('/api/notifications', createNotificationRouter(services.notificationService));
  app.use(
    '/api/tests',
    createTestRouter(services.quizService, { curatorToken: env.CURATOR_TOKEN })
  );
  app.use('/api/integrations', createIntegrationRouter(services.integrationAdapters));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
