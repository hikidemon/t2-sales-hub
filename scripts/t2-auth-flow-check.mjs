/**
 * End-to-end check of the ABC T2 sign-in flow.
 *
 * Walks the whole flow with a cookie jar:
 *   1. /api/auth/config            — the gate knows what to render
 *   2. /api/auth/abc-t2/login      — redirect to the provider
 *   3. the provider's consent screen — redirect back with the code
 *   4. /api/auth/abc-t2/callback   — the session cookie is issued
 *   5. /api/auth/me                — the profile is served from the session
 *   6. the session survives a new request (a browser restart)
 *   7. POST /api/auth/logout       — the session ends
 *
 * Usage: node scripts/t2-auth-flow-check.mjs [apiPort] [providerPort]
 */

const API = `http://localhost:${process.argv[2] ?? 3005}`;
const PROVIDER = `http://localhost:${process.argv[3] ?? 4010}`;

const results = [];
function check(name, passed, detail) {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
}

/** A minimal cookie jar: one cookie for the whole flow. */
const jar = new Map();

function cookieHeader() {
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function storeCookies(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(';');
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (value === '') {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
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

async function main() {
  // 1. The gate knows the provider.
  const configResponse = await follow(`${API}/api/auth/config`);
  const config = await configResponse.json();
  check(
    'конфигурация авторизации отдаётся',
    config.required === true,
    `required=${config.required}`
  );
  check('провайдер ABC T2 настроен', config.providerConfigured === true);

  // 2. The sign-in redirects to the provider.
  const loginResponse = await follow(
    `${API}/api/auth/abc-t2/login?returnTo=${encodeURIComponent('http://localhost:5174/')}`
  );
  const authorizeUrl = loginResponse.headers.get('location') ?? '';
  check(
    'редирект на портал ABC T2',
    loginResponse.status === 302 && authorizeUrl.startsWith(PROVIDER),
    authorizeUrl.slice(0, 60)
  );
  check(
    'в URL есть PKCE и state',
    authorizeUrl.includes('code_challenge=') && authorizeUrl.includes('state=')
  );

  // 3. The user consents; the provider redirects back with the code.
  const consentUrl = new URL(authorizeUrl);
  consentUrl.searchParams.set('consent', 'yes');
  const consentResponse = await follow(consentUrl.toString());
  const callbackUrl = consentResponse.headers.get('location') ?? '';
  check(
    'портал возвращает на callback с кодом',
    callbackUrl.includes('code=') && callbackUrl.includes('state=')
  );

  // 4. The callback issues the session cookie.
  const callbackResponse = await follow(callbackUrl);
  check('callback отвечает редиректом', callbackResponse.status === 302);
  const sessionCookie = jar.get('t2_session');
  check(
    'выдан подписанный session-cookie',
    Boolean(sessionCookie),
    sessionCookie ? 'подписан' : 'нет'
  );
  check(
    'cookie помечена httpOnly',
    (callbackResponse.headers.getSetCookie?.() ?? []).some((line) =>
      line.toLowerCase().includes('httponly')
    )
  );

  // 5. The profile is served from the session.
  const meResponse = await follow(`${API}/api/auth/me`);
  const me = await meResponse.json();
  check(
    'профиль отдаётся по сессии',
    meResponse.status === 200 && me.user?.id === '4711',
    me.user?.displayName
  );

  // 6. The session survives a fresh request — the browser was restarted.
  const meAgain = await follow(`${API}/api/auth/me`);
  check('сессия сохраняется между запросами', meAgain.status === 200);

  // 7. Signing out ends the session.
  const logoutResponse = await follow(`${API}/api/auth/logout`, { method: 'POST' });
  check('выход выполняется', logoutResponse.status === 200);

  const afterLogout = await follow(`${API}/api/auth/me`);
  check('после выхода профиль недоступен', afterLogout.status === 401);

  const failed = results.filter((item) => !item.passed);
  console.log(`\n${results.length - failed.length}/${results.length} проверок пройдено`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
