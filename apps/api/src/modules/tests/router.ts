import { Router, type Request } from 'express';
import { z } from 'zod';

import { validateTest } from '@t2-sales-hub/core';

import { hasCuratorSession } from '../auth/guards.js';
import { HttpError } from '../../shared/errors/HttpError.js';
import type { QuizService } from './service.js';

const optionSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().min(1).max(500),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  id: z.string().min(1).max(64),
  prompt: z.string().min(1).max(1000),
  options: z.array(optionSchema).min(2).max(10),
  explanation: z.string().max(2000).optional(),
  weight: z.number().positive().max(100),
});

const testInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  questions: z.array(questionSchema).max(100).default([]),
  passThreshold: z.number().min(1).max(100).default(80),
  scoring: z.enum(['pass-percentage', 'all-correct']).default('pass-percentage'),
  durationMinutes: z.number().int().min(0).max(600).default(0),
  authorName: z.string().min(1).max(200),
  dueAt: z.string().nullable().default(null),
  assigneeIds: z.array(z.string().max(64)).max(500).default([]),
});

const updateSchema = testInputSchema.partial();

const submitSchema = z.object({
  answers: z.record(z.string().max(64), z.string().max(64)),
  startedAtMs: z.number().int().nonnegative(),
});

/**
 * Quiz endpoints.
 *
 * The seller id is resolved on the server from the session — the client
 * can only ever act on its own account. Curator actions are protected by
 * the shared secret, the same way the manual refresh is.
 */
export function createTestRouter(service: QuizService, options: { curatorToken?: string }): Router {
  const router = Router();

  /**
   * Checks the curator access.
   *
   * Two ways in: the shared secret (for scripts and CI) or a session
   * with the curator or administrator role (for a person). The role
   * always comes from the server-resolved session.
   */
  const requireCurator = (req: Request) => {
    if (hasCuratorSession(req)) {
      return;
    }

    if (!options.curatorToken) {
      throw new HttpError(404, 'Curator actions are disabled', 'curator_disabled');
    }

    const provided = req.header('x-curator-token');
    if (!provided || provided !== options.curatorToken) {
      throw new HttpError(401, 'Invalid or missing curator token', 'unauthorized');
    }
  };

  /**
   * GET /api/tests/assigned/mine — the tests assigned to the current seller.
   * The seller id comes from the session, never from the query string.
   *
   * Declared before `/:id` so the literal path is not captured as an id.
   */
  router.get('/assigned/mine', (req, res) => {
    res.json({ items: service.listForSeller(req.sellerId) });
  });

  /** GET /api/tests — every test (curator view). */
  router.get('/', (_req, res) => {
    res.json({ items: service.listTests() });
  });

  /** GET /api/tests/:id — one test with its questions. */
  router.get('/:id', (req, res) => {
    const test = service.getTest(req.params.id);
    if (!test) {
      throw new HttpError(404, 'Test not found', 'test_not_found');
    }
    res.json(test);
  });

  /**
   * POST /api/tests — create a test (curator).
   */
  router.post('/', (req, res) => {
    requireCurator(req);

    const parsed = testInputSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues.map((issue) => issue.message).join('; '),
        'invalid_payload'
      );
    }

    const created = service.createTest(parsed.data);
    res.status(201).json(created);
  });

  /**
   * PATCH /api/tests/:id — update a test (curator).
   */
  router.patch('/:id', (req, res) => {
    requireCurator(req);

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues.map((issue) => issue.message).join('; '),
        'invalid_payload'
      );
    }

    const updated = service.updateTest(req.params.id, parsed.data);
    if (!updated) {
      throw new HttpError(404, 'Test not found', 'test_not_found');
    }
    res.json(updated);
  });

  /**
   * POST /api/tests/:id/publish — publish a test (curator).
   */
  router.post('/:id/publish', (req, res) => {
    requireCurator(req);

    const test = service.getTest(req.params.id);
    if (!test) {
      throw new HttpError(404, 'Test not found', 'test_not_found');
    }

    const problems = validateTest(test);
    if (problems.length > 0) {
      throw new HttpError(422, `Тест нельзя опубликовать: ${problems.join('; ')}`, 'test_invalid');
    }

    res.json(service.publishTest(req.params.id));
  });

  /**
   * POST /api/tests/:id/archive — archive a test (curator).
   */
  router.post('/:id/archive', (req, res) => {
    requireCurator(req);

    const updated = service.archiveTest(req.params.id);
    if (!updated) {
      throw new HttpError(404, 'Test not found', 'test_not_found');
    }
    res.json(updated);
  });

  /**
   * POST /api/tests/:id/attempts — submit answers (seller).
   */
  router.post('/:id/attempts', (req, res) => {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues.map((issue) => issue.message).join('; '),
        'invalid_payload'
      );
    }

    const attempt = service.submitAttempt(
      req.sellerId,
      req.params.id,
      parsed.data.answers,
      parsed.data.startedAtMs
    );

    if (!attempt) {
      throw new HttpError(404, 'Test not found or not available for taking', 'test_not_available');
    }

    res.json({
      attempt,
      // The correct answers are not sent to the client.
    });
  });

  /**
   * GET /api/tests/:id/statistics — results for the curator dashboard.
   */
  router.get('/:id/statistics', (req, res) => {
    requireCurator(req);
    res.json(service.statistics(req.params.id, 47));
  });

  return router;
}
