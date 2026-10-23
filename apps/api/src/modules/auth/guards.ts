/**
 * Role guards.
 *
 * The role comes from the session, which the server resolved from the
 * ABC T2 portal. A handler never reads a role from the request body or
 * the query string — a client cannot grant itself an administrator.
 */

import type { NextFunction, Request, RequestHandler } from 'express';

import { canCurate, isAdmin, type UserRole } from '@t2-sales-hub/core';

import { HttpError } from '../../shared/errors/HttpError.js';

/** Requires the user to hold at least one of the roles. */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Request['res'], next: NextFunction) => {
    const user = req.user;

    if (!user) {
      next(
        new HttpError(
          401,
          'Sign in through the ABC T2 portal to access this resource',
          'unauthorized'
        )
      );
      return;
    }

    if (!user.roles.some((role) => roles.includes(role))) {
      next(
        new HttpError(
          403,
          `This action requires one of the roles: ${roles.join(', ')}`,
          'forbidden'
        )
      );
      return;
    }

    next();
  };
}

/** Requires the curator or the administrator role. */
export function requireCuratorRole(): RequestHandler {
  return requireRole('curator', 'admin');
}

/** Requires the administrator role. */
export function requireAdminRole(): RequestHandler {
  return requireRole('admin');
}

/**
 * True when the caller is signed in as a curator or an administrator.
 *
 * Used by the endpoints that are also reachable with the shared
 * service secret — the secret is for scripts, the role is for people.
 */
export function hasCuratorSession(req: Request): boolean {
  return canCurate(req.user) || isAdmin(req.user);
}

/**
 * True when the caller is signed in as an administrator.
 *
 * Used by the endpoints that are also reachable with the shared
 * service secret — the secret is for scripts, the role is for people.
 */
export function hasAdminSession(req: Request): boolean {
  return isAdmin(req.user);
}
