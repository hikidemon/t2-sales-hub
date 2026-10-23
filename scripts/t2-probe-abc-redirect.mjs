/**
 * Следует цепочке редиректов входа «T2 ID» на ABC T2 и печатает её.
 *
 * Usage: node scripts/t2-probe-abc-redirect.mjs [cdpPort] [url]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const CDP_PORT = Number(process.argv[2] ?? 9225);
const START =
  process.argv[3] ??
  'https://abc.t2.ru/custom_web_template.html?object_code=tele2_auth_token_test&action=login';
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
      } else if (payload.method) {
        this.events.push(payload);
      }
    });
    this.events = [];
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
    await cdp.send('Page.navigate', { url: START });
  } catch (error) {
    console.log('переход не удался:', error.message);
  }
  await sleep(9000);

  console.log('итоговый адрес:', await cdp.evaluate('location.href'));
  console.log('заголовок:', await cdp.evaluate('document.title'));
  console.log('текст:');
  console.log(await cdp.evaluate('document.body ? document.body.innerText.slice(0, 900) : null'));

  const chain = cdp.events
    .filter((event) => event.method === 'Network.requestWillBeSent')
    .map((event) => event.params.request.url)
    .filter((url, index, all) => all.indexOf(url) === index)
    .filter((url) => !/abc\.t2\.ru\/(scripts|css|img|js|fonts)/.test(url));

  console.log('\nЗАПРОСЫ ПО ЦЕПОЧКЕ:');
  for (const url of chain.slice(0, 25)) console.log('  ', url.slice(0, 220));

  cdp.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
