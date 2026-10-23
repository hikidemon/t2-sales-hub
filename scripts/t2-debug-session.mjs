/**
 * Диагностика: что именно видит браузер после входа по ПИН.
 *
 * Запуск: node scripts/t2-debug-session.mjs [cdpPort] [webUrl] [apiUrl]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const CDP_PORT = Number(process.argv[2] ?? 9225);
const WEB_URL = process.argv[3] ?? 'http://localhost:5177/';
const API_URL = process.argv[4] ?? '';
const CDP_HTTP = `http://localhost:${CDP_PORT}`;

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 0;
    this.pending = new Map();
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
      }, 30000);
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

async function main() {
  const targets = await (await fetch(`${CDP_HTTP}/json/list`)).json();
  const target = targets.find((t) => t.type === 'page');
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  await cdp.send('Page.navigate', { url: WEB_URL });
  await sleep(3500);

  console.log('на гарде:', await cdp.evaluate("document.querySelector('#pin-code') !== null"));

  await cdp.evaluate(`(() => {
    const setValue = (el, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setValue(document.querySelector('#pin-identifier'), 'ИСАКОВА');
    setValue(document.querySelector('#pin-code'), '1234');
    document.querySelector('form').requestSubmit();
    return true;
  })()`);
  await sleep(4000);

  console.log('заголовок:', await cdp.evaluate("document.querySelector('h1')?.textContent.trim()"));
  console.log(
    'тело /api/auth/me:',
    await cdp.evaluate(
      "(async () => { const r = await fetch('/api/auth/me', {credentials: 'same-origin'}); return await r.text(); })()"
    )
  );
  console.log('cookie в браузере:', await cdp.evaluate('document.cookie'));
  console.log(
    'роль в интерфейсе:',
    await cdp.evaluate(
      "(() => { const el = document.querySelector('aside span'); return el ? el.textContent.trim() : null; })()"
    )
  );

  await cdp.send('Page.navigate', { url: `${WEB_URL}admin` });
  await sleep(3500);
  console.log('на /admin:', await cdp.evaluate("document.querySelector('h1')?.textContent.trim()"));
  console.log(
    'роль в интерфейсе на /admin:',
    await cdp.evaluate(
      "(() => { const el = document.querySelector('aside span'); return el ? el.textContent.trim() : null; })()"
    )
  );

  cdp.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
