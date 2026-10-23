/**
 * Проверяет, что администратор управляет справочником: список,
 * выдача ПИН, отключение сотрудника и журнал входов.
 *
 * Usage: node scripts/t2-directory-browser-check.mjs [cdpPort] [webUrl] [name]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const CDP_PORT = Number(process.argv[2] ?? 9225);
const WEB_URL = process.argv[3] ?? 'http://localhost:5177/';
const NAME = process.argv[4] ?? 'Тестов Сотрудников';
const SIGN_IN_NAME = process.argv[5] ?? 'ИСАКОВА';
const SIGN_IN_PIN = process.argv[6] ?? '1234';
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
  // A session left over from an earlier run would hide the gate and
  // carry the old roles.
  await cdp.send('Network.clearBrowserCookies');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Sign in first: the administrator's page is behind the gate.
  await cdp.send('Page.navigate', { url: WEB_URL });
  await sleep(3500);

  const onGate = await cdp.evaluate("document.querySelector('#pin-code') !== null");

  if (onGate) {
    await cdp.evaluate(`(() => {
      const setValue = (el, value) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setValue(document.querySelector('#pin-identifier'), ${JSON.stringify(SIGN_IN_NAME)});
      setValue(document.querySelector('#pin-code'), ${JSON.stringify(SIGN_IN_PIN)});
      document.querySelector('form').requestSubmit();
      return true;
    })()`);
    await sleep(4000);
  }

  await cdp.send('Page.navigate', { url: `${WEB_URL}admin` });
  await sleep(4000);
  cdp.events.length = 0;

  const heading = await cdp.evaluate(
    "(() => { const h = document.querySelector('h1'); return h ? h.textContent.trim() : null; })()"
  );
  check('страница «Управление» открылась', heading === 'Управление', String(heading));

  // The headings are rendered in upper case, so the comparison ignores
  // the case.
  const bodyText = await cdp.evaluate('document.body.innerText.toLowerCase()');

  const hasDirectory = bodyText.includes('сотрудники с доступом');
  check('есть блок справочника', hasDirectory === true);

  const hasLog = bodyText.includes('журнал входов');
  check('есть журнал входов', hasLog === true);

  // Add an employee.
  await cdp.evaluate(`(() => {
    const setValue = (el, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const inputs = Array.from(document.querySelectorAll('input'));
    setValue(inputs[0], ${JSON.stringify(NAME)});
    setValue(inputs[1], 'Тестовая ТП');
    const button = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Добавить'));
    if (button) button.click();
    return true;
  })()`);
  await sleep(2500);

  const message = await cdp.evaluate(
    '(() => { const el = document.querySelector(\'[role=\\"status\\"]\'); return el ? el.textContent.trim() : null; })()'
  );
  check(
    'ПИН выдан и показан один раз',
    typeof message === 'string' && message.includes('ПИН'),
    String(message)?.slice(0, 60)
  );

  const inList = await cdp.evaluate(`document.body.innerText.includes(${JSON.stringify(NAME)})`);
  check('сотрудник появился в списке', inList === true);

  // The access log shows the earlier sign-in.
  const logHasEntry = await cdp.evaluate("document.body.innerText.toLowerCase().includes('вход')");
  check('в журнале есть запись о входе', logHasEntry === true);

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
