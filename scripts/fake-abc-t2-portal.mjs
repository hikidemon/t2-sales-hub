/**
 * A fake ABC T2 portal for end-to-end verification of the sign-in flow.
 *
 * It implements the three endpoints the application uses:
 *   GET  /oauth/authorize — shows a consent screen, then redirects back
 *   POST /oauth/token     — exchanges the code for a token
 *   GET  /api/v1/me       — returns the profile of the signed-in user
 *
 * Usage: node scripts/fake-abc-t2-portal.mjs [port]
 */

import { createServer } from 'node:http';

const PORT = Number(process.argv[2] ?? 4010);

/** The code the portal issues; the token endpoint accepts only this one. */
const VALID_CODE = 'valid-code';

function json(res, payload, status = 200) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  // --- Authorisation: the consent screen ---------------------------------
  if (url.pathname === '/oauth/authorize') {
    const redirectUri = url.searchParams.get('redirect_uri') ?? '';
    const state = url.searchParams.get('state') ?? '';
    const codeChallenge = url.searchParams.get('code_challenge') ?? '';

    // The "user" clicks "Allow" — the form posts back with the code.
    if (url.searchParams.get('consent') === 'yes') {
      const target = new URL(redirectUri);
      target.searchParams.set('code', VALID_CODE);
      target.searchParams.set('state', state);
      res.writeHead(302, { location: target.toString() });
      res.end();
      return;
    }

    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>ABC T2 — вход</title></head>
<body style="font-family:system-ui;padding:40px">
  <h1>ABC T2</h1>
  <p>Войти под корпоративной учётной записью?</p>
  <form method="get" action="/oauth/authorize">
    <input type="hidden" name="redirect_uri" value="${redirectUri}">
    <input type="hidden" name="state" value="${state}">
    <input type="hidden" name="code_challenge" value="${codeChallenge}">
    <input type="hidden" name="client_id" value="${url.searchParams.get('client_id') ?? ''}">
    <button type="submit" name="consent" value="yes">Разрешить</button>
  </form>
</body></html>`);
    return;
  }

  // --- Token endpoint ----------------------------------------------------
  if (url.pathname === '/oauth/token' && req.method === 'POST') {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      const body = new URLSearchParams(raw);
      const grantType = body.get('grant_type');

      if (grantType === 'refresh_token') {
        if (body.get('refresh_token') !== 'refresh-abc-456') {
          json(res, { error: 'invalid_grant' }, 400);
          return;
        }
        json(res, {
          access_token: 'access-abc-refreshed',
          refresh_token: 'refresh-abc-456',
          expires_in: 3600,
          token_type: 'Bearer',
        });
        return;
      }

      if (body.get('code') !== VALID_CODE) {
        json(res, { error: 'invalid_grant' }, 400);
        return;
      }

      json(res, {
        access_token: 'access-abc-123',
        refresh_token: 'refresh-abc-456',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'profile sales',
      });
    });
    return;
  }

  // --- Profile endpoint --------------------------------------------------
  if (url.pathname === '/api/v1/me') {
    const authorization = req.headers.authorization ?? '';
    if (!authorization.startsWith('Bearer ')) {
      json(res, { error: 'unauthorized' }, 401);
      return;
    }
    json(res, {
      id: 4711,
      login: 'i.petrova',
      full_name: 'Иванова Пётр Петрович',
      email: 'i.petrova@t2.ru',
      position: 'Продавец-консультант',
      region_name: 'Новосибирск',
      roles: ['seller'],
    });
    return;
  }

  json(res, { error: 'not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`[fake-abc-t2] listening on http://localhost:${PORT}`);
});
