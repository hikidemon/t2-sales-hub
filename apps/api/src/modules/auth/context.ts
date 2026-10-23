/**
 * Resolves the signed-in user for every request.
 *
 * The user is attached to the request by the server from the session
 * cookie — a handler never reads an identity from the request body or
 * the query string.
 */

import type { Request, RequestHandler } from 'express';

import type { AuthService, AuthUser } from '@t2-sales-hub/core';

import { env } from '../../shared/config/env.js';
import { HttpError } from '../../shared/errors/HttpError.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The signed-in user, when there is one. */
      user?: AuthUser;
    }
  }
}

export interface AuthContextOptions {
  authService: AuthService;
  /** Reads the session id from the request cookie. */
  readSessionId: (req: Request) => string | undefined;
}

/**
 * Attaches `req.user` when a valid session is present.
 *
 * It never rejects the request: the routes decide whether a login is
 * required. That keeps the demo mode (no login) working with the same
 * code path.
 */
export function authContext(options: AuthContextOptions): RequestHandler {
  return (req, _res, next) => {
    const sessionId = options.readSessionId(req);

    if (!sessionId) {
      next();
      return;
    }

    void options.authService
      .getSession(sessionId)
      .then((session) => {
        if (session) {
          req.user = session.user;
        }
      })
      .catch(() => {
        // A broken session must not break the request.
      })
      .finally(() => {
        next();
      });
  };
}

/**
 * Rejects the request when no user is signed in.
 *
 * Used by the routes that expose personal data: without a session
 * there is nobody whose data could be served.
 */
export function requireAuth(): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(
        new HttpError(
          401,
          'Sign in through the ABC T2 portal to access this resource',
          'unauthorized'
        )
      );
      return;
    }
    next();
  };
}

/** True when the application requires a sign-in. */
export function isAuthRequired(): boolean {
  return env.AUTH_REQUIRED;
}
