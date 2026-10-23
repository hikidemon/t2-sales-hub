/**
 * Extracts the real design tokens of a site with headless Chrome.
 *
 * Collects the computed styles of the visible elements, the CSS custom
 * properties declared in :root, the loaded font families and the colour
 * palette actually used in the markup. Read-only.
 *
 * Usage: node scripts/extract-design-tokens.mjs <url> [port]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const URL_TO_INSPECT = process.argv[2] ?? 'https://t2.ru/';
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
  const root = getComputedStyle(document.documentElement);
  const customProps = {};
  for (const name of document.styleSheets) {
    let rules;
    try { rules = name.cssRules; } catch { continue; }
    for (const rule of rules) {
      if (rule.style) {
        for (const prop of rule.style) {
          if (prop.startsWith('--')) {
            const value = rule.style.getPropertyValue(prop).trim();
            if (value && !customProps[prop]) customProps[prop] = value;
          }
        }
      }
    }
  }

  const fontFamilies = new Set();
  const colors = new Map();
  const radii = new Map();
  const shadows = new Map();
  const gradients = new Map();

  const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

  document.querySelectorAll('body *').forEach((el) => {
    const style = getComputedStyle(el);
    if (el.textContent && el.textContent.trim().length > 0) {
      fontFamilies.add(style.fontFamily.split(',')[0].trim());
    }
    for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor']) {
      const value = style[prop];
      if (value && value !== 'rgba(0, 0, 0, 0)') bump(colors, value);
    }
    if (style.borderRadius && style.borderRadius !== '0px') bump(radii, style.borderRadius);
    if (style.boxShadow && style.boxShadow !== 'none') bump(shadows, style.boxShadow);
    if (style.backgroundImage && style.backgroundImage.includes('gradient')) {
      bump(gradients, style.backgroundImage.slice(0, 120));
    }
  });

  const top = [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24);
  const topRadii = [...radii.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topShadows = [...shadows.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topGradients = [...gradients.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
    .slice(0, 10)
    .map((el) => {
      const s = getComputedStyle(el);
      return {
        tag: el.tagName,
        text: el.textContent.trim().slice(0, 40),
        size: s.fontSize,
        weight: s.fontWeight,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        fontFamily: s.fontFamily.split(',')[0].trim(),
      };
    });

  const body = getComputedStyle(document.body);
  const html = getComputedStyle(document.documentElement);

  return {
    title: document.title,
    url: location.href,
    htmlBg: html.backgroundColor,
    bodyBg: body.backgroundColor,
    bodyColor: body.color,
    bodyFont: body.fontFamily.split(',')[0].trim(),
    bodyFontSize: body.fontSize,
    customProps: Object.fromEntries(Object.entries(customProps).slice(0, 60)),
    colors: top,
    radii: topRadii,
    shadows: topShadows,
    gradients: topGradients,
    fonts: [...fontFamilies].slice(0, 10),
    headings,
  };
})()`;

async function main() {
  const listResponse = await fetch(`http://localhost:${PORT}/json/list`);
  const targets = await listResponse.json();
  const target = targets.find((t) => t.type === 'page');
  if (!target) throw new Error('no page target');

  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

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
