/**
 * Смотрит страницу ABC T2 и ищет следы OAuth-эндпоинтов.
 *
 * Usage: node scripts/t2-probe-abc.mjs [cdpPort] [url]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const CDP_PORT = Number(process.argv[2] ?? 9225);
const URL = process.argv[3] ?? 'https://abc.t2.ru/view_doc.html?mode=default';
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
      }, 60000);
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

  try {
    await cdp.send('Page.navigate', { url: URL });
  } catch (error) {
    console.log(`Не удалось перейти: ${error.message}`);
  }
  await sleep(8000);

  console.log('адрес:', await cdp.evaluate('location.href'));
  console.log('заголовок:', await cdp.evaluate('document.title'));
  console.log('текст:');
  console.log(await cdp.evaluate('document.body ? document.body.innerText.slice(0, 1500) : null'));

  const html = await cdp.evaluate('document.documentElement.outerHTML.slice(0, 4000)');
  const hits = [
    ...String(html).matchAll(
      /[^\s"'<>()]*(oauth|authorize|token|openid|oidc|sso|login|auth)[^\s"'<>()]*/gi
    ),
  ]
    .map((m) => m[0])
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 40);
  console.log('\nупоминания авторизации в HTML:');
  for (const hit of hits) console.log('  ', hit);

  cdp.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
