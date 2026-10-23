/**
 * Checks that a session survives a restart of the API.
 *
 * The requirement behind the check: the seller signs in once through the
 * ABC T2 portal and does not have to sign in again — not after closing
 * the browser, and not after the server was restarted.
 *
 * Two phases, so the restart can happen in between:
 *
 *   node scripts/t2-auth-restart-check.mjs signin  — signs in and saves
 *                                                      the cookie
 *   node scripts/t2-auth-restart-check.mjs verify  — presents the saved
 *                                                      cookie to the API
 *
 * Usage: node scripts/t2-auth-restart-check.mjs <signin|verify> [apiPort] [providerPort]
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const phase = process.argv[2] ?? 'signin';
const API = `http://localhost:${process.argv[3] ?? 3005}`;
const PROVIDER = `http://localhost:${process.argv[4] ?? 4010}`;
const COOKIE_FILE = '.data/session-cookie.txt';

const jar = new Map();

function cookieHeader() {
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function storeCookies(response) {
  for (const line of response.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(';');
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (value === '') jar.delete(name);
    else jar.set(name, value);
  }
}

async function follow(url, options = {}) {
  const response = await fetch(url, {
    redirect: 'manual',
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(jar.size > 0 ? { cookie: cookieHeader() } : {}),
    },
  });
  storeCookies(response);
  return response;
}

async function signIn() {
  const login = await follow(
    `${API}/api/auth/abc-t2/login?returnTo=${encodeURIComponent('http://localhost:5174/')}`
  );
  const authorizeUrl = login.headers.get('location') ?? '';
  if (!authorizeUrl.startsWith(PROVIDER)) {
    throw new Error(`Unexpected authorisation URL: ${authorizeUrl}`);
  }

  const consent = new URL(authorizeUrl);
  consent.searchParams.set('consent', 'yes');
  const consentResponse = await follow(consent.toString());
  const callbackUrl = consentResponse.headers.get('location') ?? '';

  await follow(callbackUrl);

  const cookie = jar.get('t2_session');
  if (!cookie) throw new Error('No session cookie was issued');

  await mkdir(dirname(COOKIE_FILE), { recursive: true });
  await writeFile(COOKIE_FILE, cookie, 'utf8');

  const me = await follow(`${API}/api/auth/me`);
  const body = await me.json();
  console.log(`signed in as ${body.user?.displayName} (${body.user?.id})`);
}

async function verify() {
  const cookie = (await readFile(COOKIE_FILE, 'utf8')).trim();
  jar.set('t2_session', cookie);

  const me = await follow(`${API}/api/auth/me`);
  const body = await me.json();

  if (me.status !== 200 || !body.user) {
    console.error(`FAIL — после перезапуска сессия не восстановилась (${me.status})`);
    process.exit(1);
  }

  console.log(
    `PASS — после перезапуска API сессия жива: ${body.user.displayName} (${body.user.id})`
  );
}

if (phase === 'signin') {
  await signIn();
} else if (phase === 'verify') {
  await verify();
} else {
  console.error(`Unknown phase: ${phase}`);
  process.exit(1);
}
