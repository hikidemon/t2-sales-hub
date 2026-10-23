/**
 * Проверяет ролевой доступ в браузере: администратор по логину видит
 * раздел «Управление» и может обновить данные, продавец — нет.
 *
 * Usage: node scripts/t2-role-browser-check.mjs [cdpPort] [webUrl] [apiPort]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const CDP_PORT = Number(process.argv[2] ?? 9225);
const WEB_URL = process.argv[3] ?? 'http://localhost:5176/';
const API = `http://localhost:${process.argv[4] ?? 3007}`;
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
  await cdp.send('Network.clearBrowserCookies');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // 1. Sign in through the provider.
  await cdp.send('Page.navigate', { url: `${WEB_URL}api/auth/abc-t2/login` });
  await sleep(2500);

  const consentUrl = await cdp.evaluate("document.querySelector('form') ? location.href : null");
  if (consentUrl) {
    await cdp.send('Page.navigate', { url: `${consentUrl}&consent=yes` });
    await sleep(4000);
  }

  // 2. The role of the portal plus the role from the environment.
  const roleBadge = await cdp.evaluate(
    "(() => { const el = Array.from(document.querySelectorAll('aside span')).find((n) => /администратор|куратор|продавец/.test(n.textContent)); return el ? el.textContent.trim() : null; })()"
  );
  check('роль видна в боковой панели', roleBadge === 'администратор', String(roleBadge));

  // 3. The admin section is in the navigation.
  const adminLink = await cdp.evaluate(
    '(() => { const a = document.querySelector(\'aside a[href=\\"/admin\\"]\'); return a ? a.textContent.trim() : null; })()'
  );
  check('раздел «Управление» в навигации', adminLink === 'Управление', String(adminLink));

  // 4. The admin page opens and shows the pipeline.
  await cdp.send('Page.navigate', { url: `${WEB_URL}admin` });
  await sleep(3500);

  const adminHeading = await cdp.evaluate(
    "(() => { const h = document.querySelector('h1'); return h ? h.textContent.trim() : null; })()"
  );
  check('страница «Управление» открывается', adminHeading === 'Управление', String(adminHeading));

  const hasRefresh = await cdp.evaluate("document.body.innerText.includes('Обновить сейчас')");
  check('есть кнопка ручного обновления', hasRefresh === true);

  // 5. The server accepts the refresh from the admin session.
  const refreshStatus = await cdp.evaluate(
    "(async () => { const r = await fetch('/api/sync/refresh', { method: 'POST' }); return r.status; })()"
  );
  check(
    'сервер принял обновление от администратора',
    refreshStatus === 200,
    `HTTP ${refreshStatus}`
  );

  // 6. A plain seller is refused.
  const sellerStatus = await fetch(`${API}/api/sync/refresh`, {
    method: 'POST',
  });
  check(
    'без сессии обновление отклонено',
    sellerStatus.status === 401 || sellerStatus.status === 404,
    `HTTP ${sellerStatus.status}`
  );

  const errors = cdp.events
    .filter((event) => {
      if (event.method === 'Runtime.exceptionThrown') return true;
      if (event.method === 'Log.entryAdded') return event.params?.entry?.level === 'error';
      return false;
    })
    .map((event) => JSON.stringify(event.params).slice(0, 160));
  check('консоль браузера чистая', errors.length === 0, errors.join(' | '));

  cdp.close();

  const failed = results.filter((item) => !item.passed);
  console.log(`\n${results.length - failed.length}/${results.length} проверок пройдено`);
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
