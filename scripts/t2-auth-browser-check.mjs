/**
 * Verifies the sign-in gate in a real browser.
 *
 * Checks that:
 *   - the gate is shown when a login is required and there is no session;
 *   - the button links to the server's sign-in endpoint;
 *   - the profile of the signed-in user is shown in the header;
 *   - the console stays clean.
 *
 * Usage: node scripts/t2-auth-browser-check.mjs [cdpPort] [webUrl]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const CDP_PORT = Number(process.argv[2] ?? 9225);
const WEB_URL = process.argv[3] ?? 'http://localhost:5174/';
const CDP_HTTP = `http://localhost:${CDP_PORT}`;

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve());
      this.ws.addEventListener('error', () => reject(new Error('ws error')));
    });
    this.ws.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data);
      if (payload.id && this.pending.has(payload.id)) {
        const { resolve, reject } = this.pending.get(payload.id);
        this.pending.delete(payload.id);
        if (payload.error) reject(new Error(JSON.stringify(payload.error)));
        else resolve(payload.result ?? {});
      } else if (payload.method) {
        this.events.push(payload);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout on ${method}`));
        }
      }, 40000);
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return result?.result?.value;
  }

  close() {
    this.ws.close();
  }
}

const results = [];
function check(name, passed, detail) {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
}

async function main() {
  const targets = await (await fetch(`${CDP_HTTP}/json/list`)).json();
  const target = targets.find((t) => t.type === 'page');
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  // Start from a clean slate: a session left over from a previous run
  // would hide the gate and prove nothing.
  await cdp.send('Network.clearBrowserCookies');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // A fresh profile has no session — the gate must appear.
  await cdp.send('Page.navigate', { url: WEB_URL });
  await sleep(4000);

  const gateTitle = await cdp.evaluate(
    "document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : null"
  );
  check('показан экран входа', gateTitle === 'Вход в личный кабинет', String(gateTitle));

  const buttonText = await cdp.evaluate(
    '(() => { const a = document.querySelector(\'a[href*=\\"abc-t2/login\\"]\'); return a ? a.textContent.trim() : null; })()'
  );
  check(
    'кнопка входа через ABC T2',
    typeof buttonText === 'string' && buttonText.includes('ABC T2'),
    String(buttonText)
  );

  const buttonHref = await cdp.evaluate(
    "(() => { const a = document.querySelector('a[href*=\\\"abc-t2/login\\\"]'); return a ? a.getAttribute('href') : null; })()"
  );
  check(
    'кнопка ведёт на серверный вход',
    typeof buttonHref === 'string' && buttonHref.includes('/api/auth/abc-t2/login'),
    String(buttonHref)
  );

  const persistenceNote = await cdp.evaluate(
    "document.body.innerText.includes('сессия сохраняется')"
  );
  check('сказано, что сессия сохраняется', persistenceNote === true);

  const noPasswordField = await cdp.evaluate(
    'document.querySelectorAll(\'input[type=\\"password\\"]\').length === 0'
  );
  check('пароль не вводится в приложении', noPasswordField === true);

  // Now sign in through the provider and check the header.
  const loginUrl = `${WEB_URL.replace(/\/$/, '')}/api/auth/abc-t2/login`;
  await cdp.send('Page.navigate', { url: loginUrl });
  await sleep(2000);

  const consentUrl = await cdp.evaluate("document.querySelector('form') ? location.href : null");
  if (consentUrl) {
    await cdp.send('Page.navigate', {
      url: `${consentUrl}&consent=yes`,
    });
    await sleep(4000);
  }

  // The profile name sits in the profile block of the header — it is the
  // only paragraph with the semibold class there.
  const headerName = await cdp.evaluate(
    "(() => { const el = document.querySelector('header p.font-semibold'); return el ? el.textContent.trim() : null; })()"
  );
  check(
    'профиль ABC T2 показан в шапке',
    headerName === 'Иванова Пётр Петрович',
    String(headerName)
  );

  // The position line is the element right after the profile name — the
  // page subtitle also uses the tertiary colour, so it is not unique.
  const headerSubtitle = await cdp.evaluate(
    "(() => { const name = document.querySelector('header p.font-semibold'); const el = name ? name.nextElementSibling : null; return el ? el.textContent.trim() : null; })()"
  );
  check(
    'подпись профиля содержит должность и регион',
    typeof headerSubtitle === 'string' &&
      headerSubtitle.includes('Продавец-консультант') &&
      headerSubtitle.includes('Новосибирск'),
    String(headerSubtitle)
  );

  const providerBadge = await cdp.evaluate("document.body.innerText.includes('ABC T2')");
  check('источник сессии помечен', providerBadge === true);

  // Reload — the session must survive, the gate must not reappear.
  await cdp.send('Page.navigate', { url: WEB_URL });
  await sleep(3500);
  const titleAfterReload = await cdp.evaluate(
    "document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : null"
  );
  check(
    'после перезагрузки вход не требуется',
    titleAfterReload === 'Личный кабинет продавца',
    String(titleAfterReload)
  );

  const errors = cdp.events
    .filter((event) => {
      if (event.method === 'Runtime.exceptionThrown') return true;
      if (event.method === 'Log.entryAdded') {
        return event.params?.entry?.level === 'error';
      }
      return false;
    })
    .map((event) => JSON.stringify(event.params).slice(0, 200));
  check('консоль браузера чистая', errors.length === 0, errors.join(' | '));

  cdp.close();

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
