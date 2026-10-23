/**
 * Signed session cookies.
 *
 * The cookie carries the session id together with a signature. Even
 * though the session id is opaque, signing it means a client cannot
 * craft a cookie that points at somebody else's session.
 *
 * The signature is HMAC-SHA256 with a secret from the environment.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE_VERSION = 'v1';

/** Builds the signed value of a session cookie. */
export function signSessionId(sessionId: string, secret: string): string {
  const payload = `${SESSION_COOKIE_VERSION}.${sessionId}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Verifies and extracts the session id.
 * Returns null when the cookie is malformed or the signature does not match.
 */
export function verifySessionId(cookieValue: string | undefined, secret: string): string | null {
  if (!cookieValue) return null;

  const parts = cookieValue.split('.');
  if (parts.length !== 3) return null;

  const [version, sessionId, signature] = parts;
  if (version !== SESSION_COOKIE_VERSION || !sessionId || !signature) {
    return null;
  }

  const expected = createHmac('sha256', secret)
    .update(`${version}.${sessionId}`)
    .digest('base64url');

  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);

  if (given.length !== wanted.length) {
    return null;
  }
  if (!timingSafeEqual(given, wanted)) {
    return null;
  }

  return sessionId;
}
