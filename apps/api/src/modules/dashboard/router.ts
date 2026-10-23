import { Router } from 'express';

import { HttpError } from '../../shared/errors/HttpError.js';
import type { DataSyncService } from '@t2-sales-hub/core';

/**
 * Dashboard endpoints.
 *
 * The service serves the cached snapshot — it never triggers a read of
 * the external source per request. A refresh happens on the schedule or
 * through POST /api/sync/refresh.
 */
export function createDashboardRouter(syncService: DataSyncService): Router {
  const router = Router();

  /** GET /api/dashboard/periods — the periods the source can serve. */
  router.get('/periods', async (_req, res, next) => {
    try {
      const periods = await syncService.listAvailablePeriods();
      res.json({ items: periods });
    } catch (error) {
      next(error);
    }
  });

  /** GET /api/dashboard — the full dashboard payload for the period. */
  router.get('/', (req, res, next) => {
    const periodId = typeof req.query.period === 'string' ? req.query.period : undefined;
    const snapshot = syncService.getSnapshot();

    if (!snapshot) {
      next(
        new HttpError(
          503,
          'Data is not available yet — the first synchronisation has not completed',
          'data_not_ready'
        )
      );
      return;
    }

    const data = snapshot.data;
    if (periodId && periodId !== data.period.id) {
      // Only the period present in the snapshot can be served.
      next(new HttpError(404, `Period ${periodId} is not available`, 'period_not_found'));
      return;
    }

    res.json({
      data,
      meta: {
        capturedAt: snapshot.capturedAt,
        source: snapshot.source,
        status: syncService.getStatus(),
      },
    });
  });

  /** GET /api/ranking — the ranking block of the current snapshot. */
  router.get('/ranking', (_req, res, next) => {
    const snapshot = syncService.getSnapshot();
    if (!snapshot) {
      next(new HttpError(503, 'Data is not available yet', 'data_not_ready'));
      return;
    }
    res.json(snapshot.data.ranking);
  });

  /** GET /api/employee/:id/income — the income block of the demo seller. */
  router.get('/employee/:id/income', (req, res, next) => {
    const snapshot = syncService.getSnapshot();
    if (!snapshot) {
      next(new HttpError(503, 'Data is not available yet', 'data_not_ready'));
      return;
    }

    const requestedId = req.params.id;
    // The demo exposes only the demo seller — no other id is resolvable.
    if (requestedId !== snapshot.data.seller.id) {
      next(new HttpError(404, 'Seller not found', 'seller_not_found'));
      return;
    }

    res.json({
      seller: snapshot.data.seller,
      income: snapshot.data.income,
      period: snapshot.data.period,
    });
  });

  return router;
}
