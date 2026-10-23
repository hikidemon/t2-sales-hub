/**
 * Читает скрипты страницы ABC T2 через контекст браузера и ищет
 * эндпоинты авторизации (T2 ID, SSO, OAuth).
 *
 * Usage: node scripts/t2-probe-abc-auth.mjs [cdpPort]
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

const PATTERN =
  /((https?:\/\/[^"'\s<>)]*(?:id|auth|login|sso|oauth|token)[^"'\s<>)]*)|((?:[a-z_]+\.)*(?:set_auth|post_auth|t2id|t2_id|openid)[a-z_]*\s*[:=]\s*[^;\n]{0,120})|((?:object_code|url|href)\s*[:=]\s*['"][^'"]{0,120}['"]))/gi;

async function main() {
  const targets = await (await fetch(`${CDP_HTTP}/json/list`)).json();
  const target = targets.find((t) => t.type === 'page');
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: 'https://abc.t2.ru/view_doc.html?mode=default' });
  await sleep(7000);

  // 1. Инлайновые обработчики рядом с «Войти через T2 ID».
  const inline = await cdp.evaluate(`(() => {
    const html = document.documentElement.outerHTML;
    const index = html.indexOf('T2 ID');
    if (index < 0) return null;
    return html.slice(Math.max(0, index - 1500), index + 1500);
  })()`);
  console.log('ФРАГМЕНТ РЯДОМ С «T2 ID»:');
  console.log(inline ? inline.replace(/\s+/g, ' ').slice(0, 2200) : 'не найден');

  // 2. Скрипты страницы — ищем адреса авторизации.
  const sources = await cdp.evaluate(`(async () => {
    const urls = Array.from(document.querySelectorAll('script[src]')).map((s) => s.src);
    const own = urls.filter((u) => u.includes('abc.t2.ru'));
    const found = [];
    for (const url of own) {
      try {
        const response = await fetch(url, { credentials: 'omit' });
        const text = await response.text();
        found.push({ url, text: text.slice(0, 400000) });
      } catch (error) {
        found.push({ url, text: '' });
      }
    }
    return found;
  })()`);

  console.log('\nНАЙДЕНО В СКРИПТАХ:');
  for (const source of sources ?? []) {
    const hits = [...String(source.text).matchAll(PATTERN)]
      .map((match) => match[0].trim())
      .filter((value, index, all) => all.indexOf(value) === index)
      .filter((value) => value.length > 6)
      .slice(0, 12);
    if (hits.length === 0) continue;
    console.log(`\n  ${source.url}`);
    for (const hit of hits) console.log('    ', hit.slice(0, 200));
  }

  cdp.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
