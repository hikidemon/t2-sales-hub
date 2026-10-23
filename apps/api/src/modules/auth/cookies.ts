/**
 * Cookie helpers.
 *
 * Express does not parse cookies on its own, and the project avoids
 * adding a dependency for a single header. The parser below handles
 * the `Cookie` header format and is enough for the session cookie.
 */

import type { CookieOptions, Request, Response } from 'express';

/** Parses the `Cookie` header into a plain object. */
export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;

    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name) continue;

    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

/** Reads a cookie of a request. */
export function readCookie(req: Request, name: string): string | undefined {
  return parseCookies(req.headers.cookie)[name];
}

/** Writes a cookie. */
export function writeCookie(
  res: Response,
  name: string,
  value: string,
  options: CookieOptions
): void {
  res.cookie(name, value, options);
}

/** Clears a cookie. */
export function clearCookie(res: Response, name: string, options: CookieOptions): void {
  res.clearCookie(name, { ...options, maxAge: undefined });
}
