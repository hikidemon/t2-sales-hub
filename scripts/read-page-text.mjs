/**
 * Extracts the visible text of a page and prints a slice of it.
 *
 * Usage: node scripts/read-page-text.mjs <url> [port] [startMarker] [length]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const URL_TO_INSPECT = process.argv[2];
const PORT = Number(process.argv[3] ?? 9223);
const MARKER = process.argv[4] ?? '';
const LENGTH = Number(process.argv[5] ?? 3000);

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

async function main() {
  const listResponse = await fetch(`http://localhost:${PORT}/json/list`);
  const targets = await listResponse.json();
  const target = targets.find((t) => t.type === 'page');
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: URL_TO_INSPECT });
  await sleep(6000);
  const text = await cdp.evaluate("document.body.innerText.replace(/\\n{3,}/g, '\\n\\n').trim()");
  const index = MARKER ? text.indexOf(MARKER) : 0;
  console.log(index >= 0 ? text.slice(index, index + LENGTH) : text.slice(0, LENGTH));
  cdp.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
