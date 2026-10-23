import { Router } from 'express';

import { HttpError } from '../../shared/errors/HttpError.js';
import { asyncHandler } from '../../shared/middleware/errorHandler.js';
import { describeIntegrations } from './registry.js';
import type { ExternalSystemAdapter, ExternalSystemKind } from '@t2-sales-hub/core';

/**
 * Integration endpoints.
 *
 * The client can read the state of the integrations but cannot trigger
 * them or pass a source URL — the server decides what is read.
 */
export function createIntegrationRouter(
  adapters: Map<ExternalSystemKind, ExternalSystemAdapter>
): Router {
  const router = Router();

  /** GET /api/integrations — the state of every known external system. */
  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json({ items: await describeIntegrations(adapters) });
    })
  );

  /** GET /api/integrations/:kind — the state of one system. */
  router.get(
    '/:kind',
    asyncHandler(async (req, res) => {
      const descriptors = await describeIntegrations(adapters);
      const descriptor = descriptors.find((item) => item.kind === req.params.kind);

      if (!descriptor) {
        throw new HttpError(404, 'Unknown integration', 'integration_not_found');
      }
      res.json(descriptor);
    })
  );

  return router;
}
