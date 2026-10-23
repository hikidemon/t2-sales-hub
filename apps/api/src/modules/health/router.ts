import { Router } from 'express';

import { buildHealthInfo } from './healthInfo.js';

export const healthRouter = Router();

/**
 * GET /api/health — service liveness check.
 * Public endpoint; exposes no personal or financial data.
 */
healthRouter.get('/', (_req, res) => {
  res.json(buildHealthInfo());
});
