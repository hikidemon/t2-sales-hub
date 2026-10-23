/**
 * Читает OIDC-конфигурацию провайдера ABC T2 (auth.t2.ru) через
 * контекст браузера и печатает реальные эндпоинты.
 *
 * Usage: node scripts/t2-probe-abc-oidc.mjs [cdpPort]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const CDP_PORT = Number(process.argv[2] ?? 9225);
const CDP_HTTP = `http://localhost:${CDP_PORT}`;

const CANDIDATES = [
  'https://auth.t2.ru/.well-known/openid-configuration',
  'https://auth.t2.ru/.well-known/openid-configuration/profile',
  'https://abc.t2.ru/.well-known/openid-configuration',
];

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
  await sleep(6000);

  for (const url of CANDIDATES) {
    console.log(`\n=== ${url} ===`);

    const result = await cdp.evaluate(`(async () => {
      try {
        const response = await fetch(${JSON.stringify(url)}, { credentials: 'omit' });
        const text = await response.text();
        return { status: response.status, text: text.slice(0, 4000) };
      } catch (error) {
        return { status: 0, text: String(error) };
      }
    })()`);

    console.log('статус:', result?.status);
    if (result?.status === 200) {
      try {
        const config = JSON.parse(result.text);
        console.log('issuer:', config.issuer);
        console.log('authorization_endpoint:', config.authorization_endpoint);
        console.log('token_endpoint:', config.token_endpoint);
        console.log('userinfo_endpoint:', config.userinfo_endpoint);
        console.log('end_session_endpoint:', config.end_session_endpoint);
        console.log('jwks_uri:', config.jwks_uri);
        console.log('scopes_supported:', JSON.stringify(config.scopes_supported));
        console.log(
          'code_challenge_methods_supported:',
          JSON.stringify(config.code_challenge_methods_supported)
        );
        console.log('grant_types_supported:', JSON.stringify(config.grant_types_supported));
        console.log(
          'token_endpoint_auth_methods_supported:',
          JSON.stringify(config.token_endpoint_auth_methods_supported)
        );
        console.log('claims_supported:', JSON.stringify(config.claims_supported));
      } catch {
        console.log(result.text.slice(0, 600));
      }
    } else {
      console.log(String(result?.text).slice(0, 200));
    }
  }

  cdp.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
