import { Router } from 'express';

import { hasAdminSession } from '../auth/guards.js';
import { env } from '../../shared/config/env.js';
import { HttpError } from '../../shared/errors/HttpError.js';
import { asyncHandler } from '../../shared/middleware/errorHandler.js';
import type { DataSyncService } from '@t2-sales-hub/core';

/**
 * Sync status and manual refresh.
 *
 * The refresh endpoint is administrative: it is protected by a shared
 * secret and is disabled entirely when no secret is configured. The
 * client can never choose which source to read — the server decides.
 */
export function createSyncRouter(syncService: DataSyncService): Router {
  const router = Router();

  /** GET /api/sync/status — current state of the sync pipeline. */
  router.get('/status', (_req, res) => {
    const status = syncService.getStatus();
    res.json({
      state: status.state,
      source: status.source,
      lastSuccessAt: status.lastSuccessAt,
      lastAttemptAt: status.lastAttemptAt,
      lastDurationMs: status.lastDurationMs,
      lastError: status.lastError,
      consecutiveFailures: status.consecutiveFailures,
      intervalMs: status.intervalMs,
      servingStaleData: status.servingStaleData,
    });
  });

  /**
   * POST /api/sync/refresh — trigger a synchronisation now.
   *
   * Two ways in: the shared secret (for scripts and CI) or a session
   * with the administrator role. The secret is only needed when no
   * secret is configured and no administrator is signed in.
   */
  router.post(
    '/refresh',
    asyncHandler(async (req, res, next) => {
      if (!hasAdminSession(req)) {
        if (!env.SYNC_REFRESH_TOKEN) {
          next(new HttpError(404, 'Manual refresh is disabled', 'refresh_disabled'));
          return;
        }

        const provided = req.header('x-sync-token');
        if (!provided || provided !== env.SYNC_REFRESH_TOKEN) {
          next(new HttpError(401, 'Invalid or missing sync token', 'unauthorized'));
          return;
        }
      }

      try {
        const result = await syncService.syncWithRetry();
        res.status(result.ok ? 200 : 502).json({
          ok: result.ok,
          at: result.at,
          durationMs: result.durationMs,
          error: result.error ?? null,
          status: syncService.getStatus(),
        });
      } catch (error) {
        next(error);
      }
    })
  );

  return router;
}
