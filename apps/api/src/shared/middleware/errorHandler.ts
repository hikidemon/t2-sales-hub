import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';

import { HttpError } from '../errors/HttpError.js';

/** Uniform 404 handler for unknown routes. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    error: {
      code: 'not_found',
      message: 'Route not found',
    },
  });
};

/**
 * Wraps an async route handler so a rejected promise reaches the error
 * middleware.
 *
 * Express 4 does not await route handlers: a `throw` inside an `async`
 * function becomes an unhandled rejection and the request hangs until
 * the client times out. Every async handler must go through this.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/**
 * Central error handler. Converts HttpError and unknown errors to JSON.
 * In production, internal error details are not exposed to the client.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Unknown error — log server-side, hide details from the client.
  console.error('[api] Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'internal_error',
      message: 'Internal server error',
    },
  });
};
