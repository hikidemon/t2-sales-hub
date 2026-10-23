/**
 * Captures a screenshot of the dashboard at a given viewport.
 *
 * Usage: node scripts/t2-screenshot.mjs <output.png> [width] [height] [cdpPort]
 */

import { writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const OUTPUT = process.argv[2] ?? 'dashboard.png';
const WIDTH = Number(process.argv[3] ?? 1440);
const HEIGHT = Number(process.argv[4] ?? 900);
const CDP_HTTP = `http://localhost:${process.env.CDP_PORT ?? process.argv[5] ?? 9222}`;
const PAGE_URL = 'http://localhost:5173/';

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
  const targets = await (await fetch(`${CDP_HTTP}/json/list`)).json();
  const target = targets.find((t) => t.type === 'page');
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: WIDTH < 768,
  });
  await cdp.send('Page.navigate', { url: PAGE_URL });
  await sleep(5000);

  // Wait for the dashboard to render its data.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const ready = await cdp.evaluate(
      "document.querySelector('h1') && document.querySelectorAll('h2,h3').length > 3"
    );
    if (ready) break;
    await sleep(400);
  }

  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });
  writeFileSync(OUTPUT, Buffer.from(shot.data, 'base64'));
  console.log(`saved ${OUTPUT}`);
  cdp.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
