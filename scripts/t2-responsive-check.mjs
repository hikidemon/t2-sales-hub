/**
 * Responsive + console check for the T2 Sales Hub dashboard.
 *
 * Connects to a headless Chrome over CDP and, for every required viewport:
 *   - checks that the page has no horizontal scroll (document scrollWidth <= clientWidth);
 *   - checks that the main content is not wider than the viewport;
 *   - collects console errors / page exceptions;
 *   - reports the rendered headline numbers so we can confirm the data really rendered.
 *
 * Usage: node scripts/t2-responsive-check.mjs [cdpPort]
 *        CDP_PORT=9224 node scripts/t2-responsive-check.mjs
 */

import { setTimeout as sleep } from 'node:timers/promises';

const CDP_HTTP = `http://localhost:${process.env.CDP_PORT ?? process.argv[2] ?? 9222}`;
const PAGE_URL = process.env.PAGE_URL ?? process.argv[3] ?? 'http://localhost:5173/';

const VIEWPORTS = [
  [320, 720, '320x720'],
  [375, 812, '375x812'],
  [390, 844, '390x844'],
  [768, 1024, '768x1024'],
  [1280, 800, '1280x800'],
  [1440, 900, '1440x900'],
];

const PROBE = `(() => {
  const doc = document.documentElement;
  const main = document.querySelector('main');
  const isClipped = (el) => {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const overflow = getComputedStyle(node).overflowX;
      if (overflow === 'hidden' || overflow === 'clip' || overflow === 'auto' || overflow === 'scroll') {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  };
  const overflowing = [];
  document.querySelectorAll('main *').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.right > doc.clientWidth + 1 && !isClipped(el)) {
      const cls = (el.className && el.className.baseVal !== undefined)
        ? el.className.baseVal
        : (el.className || '');
      overflowing.push(el.tagName + '.' + String(cls).split(' ').slice(0, 3).join('.'));
    }
  });
  const tinyText = Array.from(document.querySelectorAll('main span, main p, main li'))
    .filter((el) => {
      const size = parseFloat(getComputedStyle(el).fontSize);
      return el.textContent.trim().length > 0 && size < 10;
    })
    .map((el) => getComputedStyle(el).fontSize + ': ' + el.textContent.trim().slice(0, 30));
  return {
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    horizontalScroll: doc.scrollWidth > doc.clientWidth + 1,
    mainWidth: main ? Math.round(main.getBoundingClientRect().width) : null,
    overflowCount: overflowing.length,
    overflowSample: overflowing.slice(0, 5),
    h1: document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : null,
    headings: Array.from(document.querySelectorAll('h2, h3')).map((h) => h.textContent.trim()).slice(0, 12),
    income: (() => {
      const el = Array.from(document.querySelectorAll('p, span')).find((node) =>
        String(node.className).includes('text-4xl')
      );
      return el ? el.textContent.trim() : null;
    })(),
    chartWidth: (() => {
      const chart = document.querySelector('svg[role="img"]');
      return chart ? Math.round(chart.getBoundingClientRect().width) : null;
    })(),
    chartHeight: (() => {
      const chart = document.querySelector('svg[role="img"]');
      return chart ? Math.round(chart.getBoundingClientRect().height) : null;
    })(),
    bottomNavVisible: (() => {
      const nav = document.querySelector('nav[aria-label="Нижняя навигация"]');
      if (!nav) return false;
      return getComputedStyle(nav).display !== 'none';
    })(),
    sidebarVisible: (() => {
      const aside = document.querySelector('aside');
      if (!aside) return false;
      return getComputedStyle(aside).display !== 'none';
    })(),
    tinyText: tinyText.slice(0, 5),
    tinyTextCount: tinyText.length,
  };
})()`;

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve());
      this.ws.addEventListener('error', (event) => reject(new Error('ws error: ' + event.message)));
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

async function pickPageTarget() {
  const response = await fetch(`${CDP_HTTP}/json/list`);
  const targets = await response.json();
  const local = targets.find(
    (t) => t.type === 'page' && (t.url || '').startsWith('http://localhost:5173')
  );
  const anyPage = targets.find((t) => t.type === 'page');
  const target = local ?? anyPage;
  if (!target) throw new Error('No page target found');
  return target;
}

async function main() {
  const target = await pickPageTarget();
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');

  const report = [];

  for (const [width, height, label] of VIEWPORTS) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await cdp.send('Page.navigate', { url: PAGE_URL });
    await sleep(2500);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const ready = await cdp.evaluate(
        "document.querySelector('h1') && document.querySelectorAll('h2,h3').length > 3"
      );
      if (ready) break;
      await sleep(400);
    }

    const probe = await cdp.evaluate(PROBE);
    await sleep(400);

    const errors = cdp.events
      .filter((event) => {
        if (event.method === 'Runtime.exceptionThrown') return true;
        if (event.method === 'Log.entryAdded') {
          return event.params?.entry?.level === 'error';
        }
        return false;
      })
      .map((event) => JSON.stringify(event.params).slice(0, 260));

    cdp.events = [];
    report.push({ ...probe, viewport: label, consoleErrors: errors });
  }

  await cdp.send('Emulation.clearDeviceMetricsOverride');
  cdp.close();

  let hasProblem = false;
  for (const item of report) {
    console.log(`=== ${item.viewport} ===`);
    console.log(
      `  scrollWidth=${item.scrollWidth} clientWidth=${item.clientWidth} horizontalScroll=${item.horizontalScroll}`
    );
    console.log(
      `  mainWidth=${item.mainWidth} overflowCount=${item.overflowCount} sample=${JSON.stringify(item.overflowSample)}`
    );
    console.log(`  h1=${item.h1}`);
    console.log(`  income=${item.income}`);
    console.log(
      `  chart=${item.chartWidth}x${item.chartHeight} bottomNav=${item.bottomNavVisible} sidebar=${item.sidebarVisible}`
    );
    console.log(`  tinyTextCount=${item.tinyTextCount} sample=${JSON.stringify(item.tinyText)}`);
    console.log(`  consoleErrors=${JSON.stringify(item.consoleErrors)}`);
    console.log(`  headings=${JSON.stringify(item.headings)}`);
    console.log();

    if (item.horizontalScroll || item.overflowCount > 0 || item.consoleErrors.length > 0) {
      hasProblem = true;
    }
  }

  console.log(hasProblem ? 'RESULT: problems found' : 'RESULT: all viewports clean');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
