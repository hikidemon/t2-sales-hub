/**
 * Проверка входа по ПИН в браузере: экран, отказ при неверном ПИН,
 * успешный вход и то, что сессия переживает перезагрузку.
 *
 * Usage: node scripts/t2-pin-browser-check.mjs [cdpPort] [webUrl] [name] [pin]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const CDP_PORT = Number(process.argv[2] ?? 9225);
const WEB_URL = process.argv[3] ?? 'http://localhost:5177/';
const NAME = process.argv[4] ?? 'ИСАКОВА';
const PIN = process.argv[5] ?? '1234';
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

  await cdp.send('Page.navigate', { url: WEB_URL });
  await sleep(4000);

  // The events collected before this point belong to the pages that
  // were open before — only the application counts.
  cdp.events.length = 0;

  const heading = await cdp.evaluate(
    "(() => { const h = document.querySelector('h1'); return h ? h.textContent.trim() : null; })()"
  );
  check('показан экран входа', heading === 'Вход в кабинет', String(heading));

  const hasPinField = await cdp.evaluate("document.querySelector('#pin-code') !== null");
  check('есть поле ПИН', hasPinField === true);

  const noPortalLink = await cdp.evaluate(
    'document.querySelector(\'a[href*=\\"abc-t2/login\\"]\') === null'
  );
  check('входа через портал не предлагается', noPortalLink === true);

  // 1. A wrong PIN is refused.
  await cdp.evaluate(`(() => {
    const name = document.querySelector('#pin-identifier');
    const pin = document.querySelector('#pin-code');
    const setValue = (el, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setValue(name, ${JSON.stringify(NAME)});
    setValue(pin, '0000');
    document.querySelector('form').requestSubmit();
    return true;
  })()`);
  await sleep(2500);

  const errorText = await cdp.evaluate(
    '(() => { const el = document.querySelector(\'[role=\\"alert\\"]\'); return el ? el.textContent.trim() : null; })()'
  );
  check(
    'неверный ПИН отклонён с понятным текстом',
    typeof errorText === 'string' && errorText.includes('Неверное'),
    String(errorText)
  );

  const stillOnGate = await cdp.evaluate("document.querySelector('#pin-code') !== null");
  check('на форме входа остались', stillOnGate === true);

  // 2. The right PIN signs in.
  await cdp.evaluate(`(() => {
    const pin = document.querySelector('#pin-code');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(pin, ${JSON.stringify(PIN)});
    pin.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('form').requestSubmit();
    return true;
  })()`);
  await sleep(4000);

  const dashboardHeading = await cdp.evaluate(
    "(() => { const h = document.querySelector('h1'); return h ? h.textContent.trim() : null; })()"
  );
  check(
    'после входа открылся кабинет',
    dashboardHeading === 'Личный кабинет продавца',
    String(dashboardHeading)
  );

  const profileName = await cdp.evaluate(
    "(() => { const el = document.querySelector('header p.font-semibold'); return el ? el.textContent.trim() : null; })()"
  );
  check('в шапке имя сотрудника', profileName === NAME, String(profileName));

  // 3. The session survives a reload.
  await cdp.send('Page.navigate', { url: WEB_URL });
  await sleep(3500);
  const afterReload = await cdp.evaluate(
    "(() => { const h = document.querySelector('h1'); return h ? h.textContent.trim() : null; })()"
  );
  check(
    'после перезагрузки вход не требуется',
    afterReload === 'Личный кабинет продавца',
    String(afterReload)
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
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
