/**
 * Reports the computed styles actually applied to the dashboard.
 *
 * Verifies that the T2 palette, the display typeface and the glass
 * layers are really in effect — not just declared in the source.
 *
 * Usage: node scripts/t2-style-probe.mjs [cdpPort]
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
  const counts = {};
  document.querySelectorAll('main *').forEach((el) => {
    const style = getComputedStyle(el);
    for (const prop of ['backgroundColor', 'color', 'borderTopColor']) {
      const value = style[prop];
      if (!value || value === 'rgba(0, 0, 0, 0)') continue;
      const key = prop + ':' + value;
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 16);

  const glass = document.querySelector('.glass-surface');
  const glassStyle = glass ? getComputedStyle(glass) : null;
  const neo = document.querySelector('.neo-block, .neo-block-brand');
  const neoStyle = neo ? getComputedStyle(neo) : null;
  const h1 = document.querySelector('h1');
  const h1Style = h1 ? getComputedStyle(h1) : null;

  return {
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyColor: getComputedStyle(document.body).color,
    brandVar: getComputedStyle(document.documentElement).getPropertyValue('--color-brand-500').trim(),
    limeVar: getComputedStyle(document.documentElement).getPropertyValue('--color-lime-500').trim(),
    topColors: top,
    glass: glassStyle ? {
      background: glassStyle.backgroundColor,
      backdropFilter: glassStyle.backdropFilter,
      border: glassStyle.borderTopColor,
    } : null,
    neo: neoStyle ? {
      boxShadow: neoStyle.boxShadow,
      border: neoStyle.borderTopWidth + ' ' + neoStyle.borderTopColor,
    } : null,
    h1: h1Style ? {
      fontFamily: h1Style.fontFamily,
      fontWeight: h1Style.fontWeight,
      fontSize: h1Style.fontSize,
    } : null,
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
