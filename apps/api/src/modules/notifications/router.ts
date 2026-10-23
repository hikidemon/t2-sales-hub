import { Router } from 'express';

import { HttpError } from '../../shared/errors/HttpError.js';
import type { NotificationService } from './service.js';

const CATEGORIES = ['plan', 'bonus', 'test', 'integration', 'sync', 'announcement'] as const;

const SEVERITIES = ['info', 'success', 'warning', 'danger'] as const;

/**
 * Notification endpoints.
 *
 * Notifications are per-seller, so the seller id is resolved on the
 * server from the session — never taken from the request body.
 */
export function createNotificationRouter(service: NotificationService): Router {
  const router = Router();

  /** GET /api/notifications — the list, optionally filtered. */
  router.get('/', (req, res) => {
    const category = req.query.category;
    const severity = req.query.severity;
    const isRead = req.query.isRead;
    const limit = req.query.limit;

    if (category && !CATEGORIES.includes(category as never)) {
      throw new HttpError(400, 'Unknown notification category', 'invalid_category');
    }
    if (severity && !SEVERITIES.includes(severity as never)) {
      throw new HttpError(400, 'Unknown notification severity', 'invalid_severity');
    }
    if (isRead !== undefined && isRead !== 'true' && isRead !== 'false') {
      throw new HttpError(400, 'isRead must be true or false', 'invalid_isRead');
    }

    const parsedLimit = limit === undefined ? undefined : Number(limit);
    if (parsedLimit !== undefined && (!Number.isFinite(parsedLimit) || parsedLimit <= 0)) {
      throw new HttpError(400, 'limit must be a positive number', 'invalid_limit');
    }

    res.json({
      items: service.list({
        category: category as (typeof CATEGORIES)[number] | undefined,
        severity: severity as (typeof SEVERITIES)[number] | undefined,
        isRead: isRead === undefined ? undefined : isRead === 'true',
        limit: parsedLimit,
      }),
      summary: service.summary(),
    });
  });

  /** GET /api/notifications/summary — counters for the bell badge. */
  router.get('/summary', (_req, res) => {
    res.json(service.summary());
  });

  /** POST /api/notifications/:id/read — mark one as read. */
  router.post('/:id/read', (req, res) => {
    const marked = service.markRead(req.params.id);
    if (!marked) {
      throw new HttpError(404, 'Notification not found', 'notification_not_found');
    }
    res.json({ ok: true, summary: service.summary() });
  });

  /** POST /api/notifications/read-all — mark everything as read. */
  router.post('/read-all', (_req, res) => {
    const count = service.markAllRead();
    res.json({ ok: true, marked: count, summary: service.summary() });
  });

  return router;
}
