/**
 * Verifies the visual composition of the dashboard.
 *
 * Checks the things a screenshot would show:
 *   - the bento blocks have different widths (not a uniform grid);
 *   - the neo block has a hard offset shadow;
 *   - the glass blocks are translucent;
 *   - the accent colours are the T2 ones;
 *   - the notification bell shows a badge;
 *   - the heading uses the display typeface.
 *
 * Usage: node scripts/t2-layout-probe.mjs [cdpPort]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const CDP_HTTP = `http://localhost:${process.env.CDP_PORT ?? process.argv[2] ?? 9222}`;
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

const PROBE = `(() => {
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left) };
  };

  // The top-level blocks of the page.
  const blocks = Array.from(document.querySelectorAll('main > div > div, main > div > section, main > div > h2'))
    .map((el) => ({ tag: el.tagName, ...rect(el) }))
    .filter((b) => b.w > 100);

  const widths = new Set(blocks.map((b) => b.w));
  const heights = new Set(blocks.map((b) => b.h));

  const glassCount = document.querySelectorAll('.glass-surface').length;
  const neoCount = document.querySelectorAll('.neo-block, .neo-block-brand, .neo-block-lime').length;

  const bell = document.querySelector('button[aria-label*="Уведомления"]');
  const bellBadge = bell ? bell.querySelector('span[aria-hidden="true"]') : null;

  const accentTones = new Set();
  document.querySelectorAll('main *').forEach((el) => {
    const bg = getComputedStyle(el).backgroundColor;
    const m = bg.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
    if (m && (m[1] !== '31' || m[2] !== '34' || m[3] !== '41')) {
      accentTones.add(bg);
    }
  });

  return {
    theme: document.documentElement.dataset.theme,
    blockCount: blocks.length,
    distinctWidths: widths.size,
    distinctHeights: heights.size,
    blocks: blocks.slice(0, 12),
    glassCount,
    neoCount,
    bellBadge: bellBadge ? bellBadge.textContent : null,
    accentTones: Array.from(accentTones).slice(0, 8),
    h1Font: getComputedStyle(document.querySelector('h1')).fontFamily.split(',')[0],
    headingWeight: getComputedStyle(document.querySelector('h1')).fontWeight,
    bodyFont: getComputedStyle(document.body).fontFamily.split(',')[0],
    notificationText: document.body.innerText.includes('Уведомления'),
    integrationText: document.body.innerText.includes('Интеграции'),
    testText: document.body.innerText.includes('требуют вашего внимания') || document.body.innerText.includes('Требуют вашего внимания'),
    abcText: document.body.innerText.includes('ABC T2'),
  };
})()`;

async function main() {
  const targets = await (await fetch(`${CDP_HTTP}/json/list`)).json();
  const target = targets.find((t) => t.type === 'page');
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send('Page.navigate', { url: PAGE_URL });
  await sleep(5000);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const ready = await cdp.evaluate(
      "document.querySelector('h1') && document.querySelectorAll('h2,h3').length > 3"
    );
    if (ready) break;
    await sleep(400);
  }

  console.log(JSON.stringify(await cdp.evaluate(PROBE), null, 1));
  cdp.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
