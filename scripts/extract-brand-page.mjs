/**
 * Extracts text and colour swatches from the T2 brand style guide pages.
 *
 * Usage: node scripts/extract-brand-page.mjs <url> [port]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const URL_TO_INSPECT = process.argv[2];
const PORT = Number(process.argv[3] ?? 9223);

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
  const text = document.body.innerText.replace(/\\n{3,}/g, '\\n\\n').trim();

  // Colour swatches: elements whose background is a saturated colour.
  const swatches = [];
  document.querySelectorAll('*').forEach((el) => {
    const s = getComputedStyle(el);
    const bg = s.backgroundColor;
    const m = bg.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
    if (!m) return;
    const [, r, g, b, a] = m;
    if (a !== undefined && Number(a) < 0.9) return;
    const hex = '#' + [r, g, b].map((v) => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase();
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    if (!swatches.some((x) => x.hex === hex)) {
      swatches.push({ hex, rgb: bg, w: Math.round(rect.width), h: Math.round(rect.height) });
    }
  });

  const vars = {};
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules) {
      if (!rule.style) continue;
      for (const prop of rule.style) {
        if (prop.startsWith('--color') || prop.startsWith('--t2') || prop.startsWith('--brand')) {
          const v = rule.style.getPropertyValue(prop).trim();
          if (v && !vars[prop]) vars[prop] = v;
        }
      }
    }
  }

  return { text: text.slice(0, 6000), swatches: swatches.slice(0, 40), vars };
})()`;

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
  const probe = await cdp.evaluate(PROBE);
  console.log(JSON.stringify(probe, null, 1));
  cdp.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
