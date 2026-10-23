/**
 * Ищет на странице входа ABC T2 адрес «Войти через T2 ID» и любые
 * признаки OAuth-эндпоинтов.
 *
 * Usage: node scripts/t2-probe-abc-links.mjs [cdpPort]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const CDP_PORT = Number(process.argv[2] ?? 9225);
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
  await cdp.send('Page.navigate', { url: 'https://abc.t2.ru/view_doc.html?mode=default' });
  await sleep(7000);

  const links = await cdp.evaluate(`(() => {
    return Array.from(document.querySelectorAll('a'))
      .map((a) => ({ text: a.textContent.trim().slice(0, 60), href: a.href }))
      .filter((item) => item.href);
  })()`);

  console.log('ССЫЛКИ НА СТРАНИЦЕ:');
  for (const link of links ?? []) {
    console.log(`  "${link.text}" → ${link.href}`);
  }

  const scripts = await cdp.evaluate(`(() => {
    return Array.from(document.querySelectorAll('script[src]')).map((s) => s.src);
  })()`);
  console.log('\nСКРИПТЫ:');
  for (const src of scripts ?? []) console.log('  ', src);

  // Все URL, встречающиеся в исходном HTML.
  const raw = await cdp.evaluate('document.documentElement.outerHTML');
  const urls = [...String(raw).matchAll(/https?:\/\/[^"'\s<>)]+/g)].map((m) => m[0]);
  const unique = [...new Set(urls)].filter((url) => !/t2\.ru\/(static|css|js|img|fonts)/.test(url));
  console.log('\nURL В HTML (первые 40):');
  for (const url of unique.slice(0, 40)) console.log('  ', url);

  cdp.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
