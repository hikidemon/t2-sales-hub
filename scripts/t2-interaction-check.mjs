/**
 * Interaction check for the T2 Sales Hub dashboard.
 *
 * Verifies in a real browser that:
 *   - switching the period really reloads the dataset;
 *   - the profile menu opens and closes;
 *   - the chart tooltip reacts to hovering a data point;
 *   - the bottom (mobile) navigation and the desktop sidebar behave as expected.
 *
 * Usage: node scripts/t2-interaction-check.mjs [cdpPort]
 *        CDP_PORT=9224 node scripts/t2-interaction-check.mjs
 */

import { setTimeout as sleep } from 'node:timers/promises';

const CDP_HTTP = `http://localhost:${process.env.CDP_PORT ?? process.argv[2] ?? 9222}`;
const PAGE_URL = process.env.PAGE_URL ?? process.argv[3] ?? 'http://localhost:5173/';

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
    (t) => t.type === 'page' && (t.url || '').startsWith(new URL(PAGE_URL).origin)
  );
  const target = local ?? targets.find((t) => t.type === 'page');
  if (!target) throw new Error('No page target found');
  return target;
}

const results = [];
function check(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
}

async function main() {
  const target = await pickPageTarget();
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  // Desktop viewport
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send('Page.navigate', { url: PAGE_URL });
  await sleep(2500);

  // ru-RU uses a non-breaking space as the thousands separator.
  const readIncome = `(() => {
    const el = Array.from(document.querySelectorAll('p, span')).find((node) =>
      String(node.className).includes('text-4xl')
    );
    return el ? el.textContent.replace(/\\u00a0/g, ' ').trim() : null;
  })()`;

  // The expected income depends on the active data source: the mock
  // dataset and the live Google Sheets report have different totals.
  // The check is therefore "an income figure is rendered", not a fixed
  // number — the value itself is asserted in the API tests.
  const octoberIncome = await cdp.evaluate(readIncome);
  check(
    'доход загружен для периода по умолчанию',
    typeof octoberIncome === 'string' && /\d/.test(octoberIncome),
    String(octoberIncome)
  );

  // 1. The period switcher.
  //
  // The number of periods depends on the data source: the mock dataset
  // offers several, the live Google Sheets report often only one. The
  // check therefore adapts: with several periods it verifies that the
  // data really changes, with a single period it verifies that the
  // switcher stays consistent.
  const periodButtons = await cdp.evaluate(`(() => {
    const group = document.querySelector('[aria-label="Выбор периода"]');
    if (!group) return [];
    return Array.from(group.querySelectorAll('button')).map((b) => b.textContent.trim());
  })()`);

  const activePeriod = await cdp.evaluate(
    `(() => {
      const group = document.querySelector('[aria-label="Выбор периода"]');
      if (!group) return null;
      const pressed = group.querySelector('button[aria-pressed="true"]');
      return pressed ? pressed.textContent.trim() : null;
    })()`
  );
  check(
    'в переключателе отмечен активный период',
    typeof activePeriod === 'string' && activePeriod.length > 0,
    `${activePeriod} (всего: ${periodButtons.length})`
  );

  if (periodButtons.length > 1) {
    // Переключаемся на другой период и ждём, что данные изменятся.
    const other = periodButtons.find((label) => label !== activePeriod);

    await cdp.evaluate(`(() => {
      const group = document.querySelector('[aria-label="Выбор периода"]');
      const button = Array.from(group.querySelectorAll('button')).find((b) => b.textContent.trim() === ${JSON.stringify(other)});
      if (button) button.click();
      return Boolean(button);
    })()`);
    await sleep(1500);

    const switchedIncome = await cdp.evaluate(readIncome);
    check(
      'переключение периода меняет набор данных',
      switchedIncome !== octoberIncome,
      `${octoberIncome} -> ${switchedIncome}`
    );

    const pressed = await cdp.evaluate(
      `(() => {
        const group = document.querySelector('[aria-label="Выбор периода"]');
        const button = group ? group.querySelector('button[aria-pressed="true"]') : null;
        return button ? button.textContent.trim() : null;
      })()`
    );
    check('активный период отмечен aria-pressed', pressed === other, String(pressed));
  } else {
    // Один период — переключатель не может изменить данные.
    await cdp.evaluate(`(() => {
      const group = document.querySelector('[aria-label="Выбор периода"]');
      const button = group ? group.querySelector('button') : null;
      if (button) button.click();
      return Boolean(button);
    })()`);
    await sleep(1200);

    const sameIncome = await cdp.evaluate(readIncome);
    check(
      'единственный период не меняет данные',
      sameIncome === octoberIncome,
      `${octoberIncome} -> ${sameIncome}`
    );
  }

  // 2. Profile menu toggles
  const beforeOpen = await cdp.evaluate(
    `document.querySelector('button[aria-label="Меню профиля"]').getAttribute('aria-expanded')`
  );
  await cdp.evaluate(`document.querySelector('button[aria-label="Меню профиля"]').click()`);
  await sleep(300);
  const afterOpen = await cdp.evaluate(
    `document.querySelector('button[aria-label="Меню профиля"]').getAttribute('aria-expanded')`
  );
  const panelVisible = await cdp.evaluate(
    `Array.from(document.querySelectorAll('p')).some((p) => p.textContent.trim() === 'Демонстрационный профиль')`
  );
  check(
    'меню профиля открывается',
    beforeOpen === 'false' && afterOpen === 'true' && panelVisible,
    `${beforeOpen} -> ${afterOpen}, panel=${panelVisible}`
  );

  await cdp.evaluate(`document.querySelector('button[aria-label="Меню профиля"]').click()`);
  await sleep(200);
  const afterClose = await cdp.evaluate(
    `document.querySelector('button[aria-label="Меню профиля"]').getAttribute('aria-expanded')`
  );
  check('меню профиля закрывается', afterClose === 'false', afterClose);

  // 3. Chart tooltip reacts to a data point.
  //    `mouseenter` does not bubble, so React's delegated listener at the
  //    root never sees it — dispatch a real mouse move via CDP instead.
  //    The point labels depend on the data source, so the first chart
  //    hit area is used rather than a specific label.
  const hitBox = await cdp.evaluate(`(() => {
    const chart = document.querySelector('svg[role="img"]');
    if (!chart) return null;
    // Scroll the chart into view first — a hit area outside the
    // viewport cannot receive a synthetic mouse event.
    chart.scrollIntoView({ block: 'center' });
    // The hit areas are siblings of the SVG inside the chart container.
    const container = chart.closest('.relative');
    const hit = container ? container.querySelector('button[aria-label]') : null;
    if (!hit) return null;
    const rect = hit.getBoundingClientRect();
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
  })()`);

  if (hitBox) {
    await sleep(200);
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: hitBox.x,
      y: hitBox.y,
    });
  }
  await sleep(400);
  const tooltipText = await cdp.evaluate(
    `(() => {
      const status = document.querySelector('[role="status"]');
      return status ? status.textContent.replace(/\\u00a0/g, ' ').trim() : null;
    })()`
  );
  check(
    'подсказка графика показывает значение точки',
    Boolean(hitBox) && Boolean(tooltipText),
    `${tooltipText}`
  );

  // 4. Mobile: bottom navigation visible, sidebar hidden
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await sleep(600);
  const mobileNav = await cdp.evaluate(`(() => {
    const nav = document.querySelector('nav[aria-label="Нижняя навигация"]');
    const aside = document.querySelector('aside');
    return {
      bottomNav: nav ? getComputedStyle(nav).display !== 'none' : false,
      sidebar: aside ? getComputedStyle(aside).display !== 'none' : false,
    };
  })()`);
  check(
    'на мобильном нижняя навигация включена, боковая скрыта',
    mobileNav.bottomNav === true && mobileNav.sidebar === false,
    JSON.stringify(mobileNav)
  );

  await cdp.send('Emulation.clearDeviceMetricsOverride');
  cdp.close();

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} проверок пройдено`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
