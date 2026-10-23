import { createApp, type AppServices } from './app.js';
import { createAuthSetup } from './modules/auth/service.js';
import { FileSessionStore } from './modules/auth/FileSessionStore.js';
import { createSyncService } from './modules/sync/service.js';
import { env } from './shared/config/env.js';
import { demoAssignments, demoAttempts, demoNotifications, demoTests } from '@t2-sales-hub/core';
import { InMemoryNotificationService } from './modules/notifications/service.js';
import { InMemoryQuizService } from './modules/tests/service.js';
import { createAdapter, KNOWN_SYSTEMS } from './modules/integrations/registry.js';

const syncService = createSyncService();
const { authService, sessions, directory, accessLog, pinService, methods } = createAuthSetup();

// Restore the sessions saved by a previous run of the API, so a seller
// who is already signed in is not asked to sign in again.
if (sessions instanceof FileSessionStore) {
  await sessions.init();
}

// The employee directory of the fallback sign-in.
await directory.load();

const integrationAdapters = new Map(
  KNOWN_SYSTEMS.map((system) => [
    system.kind,
    createAdapter(
      system.kind,
      system.kind === 'google-sheets' && Boolean(env.GOOGLE_SHEETS_SPREADSHEET_ID)
    ),
  ])
);

const services: AppServices = {
  syncService,
  notificationService: new InMemoryNotificationService(demoNotifications),
  quizService: new InMemoryQuizService(demoTests, demoAttempts, demoAssignments),
  integrationAdapters,
  authService,
  directory,
  pinService,
  accessLog,
  authMethods: methods,
};

const app = createApp(services);

const server = app.listen(env.PORT, () => {
  console.warn(
    `[api] Listening on http://localhost:${env.PORT} (${env.NODE_ENV}), source=${env.DATA_SOURCE}`
  );
  console.warn(
    `[api] Auth: required=${env.AUTH_REQUIRED}, methods=${methods.join(', ')}, provider=${
      authService.isConfigured() ? 'ABC T2 configured' : 'ABC T2 not configured'
    }`
  );
  console.warn(`[api] Directory: ${directory.size} employees in ${env.AUTH_DIRECTORY_FILE}`);
});

// Initial import, then the periodic refresh.
void syncService.syncWithRetry().finally(() => {
  syncService.start();
});

/** Stops the timers and closes the server cleanly. */
function shutdown(signal: string): void {
  console.warn(`[api] ${signal} received, shutting down`);
  syncService.stop();
  server.close(() => {
    process.exit(0);
  });
  // Do not hang forever if a connection stays open.
  setTimeout(() => process.exit(0), 5_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
