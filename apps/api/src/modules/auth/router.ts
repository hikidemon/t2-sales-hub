/**
 * Authentication routes.
 *
 * The whole flow runs on the server: the browser only ever receives a
 * redirect to the ABC T2 portal and, afterwards, an opaque cookie.
 * The client secret and the provider tokens never reach the browser.
 */

import { Router, type CookieOptions, type Request } from 'express';

import type { AuthService } from '@t2-sales-hub/core';

import { env } from '../../shared/config/env.js';
import { asyncHandler } from '../../shared/middleware/errorHandler.js';
import { signSessionId, verifySessionId } from './cookie.js';
import { clearCookie, readCookie, writeCookie } from './cookies.js';
import { assignRoles } from './roles.js';
import { enabledAuthMethods } from './service.js';

/** The cookie options shared by set and clear. */
export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.AUTH_COOKIE_SECURE ?? (env.NODE_ENV === 'production' ? true : false),
    path: '/',
  };
}

/** The lifetime of the session cookie, in milliseconds. */
export function sessionCookieMaxAge(): number {
  return env.AUTH_SESSION_TTL_HOURS * 60 * 60 * 1000;
}

/** Reads and verifies the session id from the request cookie. */
export function readSessionId(req: Request): string | undefined {
  const secret = env.AUTH_COOKIE_SECRET;
  if (!secret) return undefined;

  const raw = readCookie(req, env.AUTH_COOKIE_NAME);
  return verifySessionId(raw, secret) ?? undefined;
}

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  /**
   * GET /api/auth/config — what the client needs to render the gate:
   * whether a login is required, which methods are available and
   * whether the provider is configured.
   */
  router.get('/config', (_req, res) => {
    res.json({
      required: env.AUTH_REQUIRED,
      provider: 'abc-t2',
      providerConfigured: authService.isConfigured(),
      providerName: 'ABC T2',
      methods: enabledAuthMethods(),
    });
  });

  /**
   * GET /api/auth/abc-t2/login — starts the sign-in.
   *
   * The browser is redirected to the ABC T2 portal. The `returnTo`
   * parameter is carried through the flow so the user lands back where
   * they started.
   */
  router.get(
    '/abc-t2/login',
    asyncHandler(async (req, res) => {
      const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : undefined;

      try {
        const { authorizationUrl } = await authService.startSignIn(returnTo);
        res.redirect(302, authorizationUrl);
      } catch {
        res.redirect(302, env.AUTH_FAILURE_REDIRECT_URL);
      }
    })
  );

  /**
   * GET /api/auth/abc-t2/callback — the portal sends the user back.
   */
  router.get(
    '/abc-t2/callback',
    asyncHandler(async (req, res) => {
      const code = typeof req.query.code === 'string' ? req.query.code : undefined;
      const state = typeof req.query.state === 'string' ? req.query.state : undefined;
      const error = typeof req.query.error === 'string' ? req.query.error : undefined;

      if (!code || !state) {
        res.redirect(302, env.AUTH_FAILURE_REDIRECT_URL);
        return;
      }

      const secret = env.AUTH_COOKIE_SECRET;
      if (!secret) {
        // Without a secret the cookie cannot be signed — refuse rather
        // than hand out an unsigned session.
        res.redirect(302, env.AUTH_FAILURE_REDIRECT_URL);
        return;
      }

      try {
        const { session, returnTo } = await authService.completeSignIn(code, state, error);

        // The role of the portal plus the roles the environment grants.
        const user = assignRoles(session.user, {
          adminLogins: env.AUTH_ADMIN_LOGINS,
          curatorLogins: env.AUTH_CURATOR_LOGINS,
        });

        if (user !== session.user) {
          await authService.updateSessionUser(session.id, user);
        }

        writeCookie(res, env.AUTH_COOKIE_NAME, signSessionId(session.id, secret), {
          ...sessionCookieOptions(),
          maxAge: sessionCookieMaxAge(),
        });

        res.redirect(302, returnTo ?? env.AUTH_SUCCESS_REDIRECT_URL);
      } catch {
        res.redirect(302, env.AUTH_FAILURE_REDIRECT_URL);
      }
    })
  );

  /**
   * GET /api/auth/me — the signed-in user.
   *
   * In demo mode nobody has to sign in, so "no user" is an answer and
   * not an error — the browser console stays clean. When a sign-in is
   * required, a missing session is a 401.
   */
  router.get(
    '/me',
    asyncHandler(async (req, res) => {
      const user = await authService.getUser(readSessionId(req));

      if (!user && !env.AUTH_REQUIRED) {
        res.json({ user: null });
        return;
      }

      if (!user) {
        res.status(401).json({
          error: { code: 'unauthorized', message: 'Not signed in' },
        });
        return;
      }

      res.json({ user });
    })
  );

  /**
   * POST /api/auth/logout — ends the session.
   */
  router.post(
    '/logout',
    asyncHandler(async (req, res) => {
      await authService.signOut(readSessionId(req));
      clearCookie(res, env.AUTH_COOKIE_NAME, sessionCookieOptions());
      res.json({ ok: true });
    })
  );

  return router;
}
