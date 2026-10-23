/**
 * Exercises the GoogleSheetsAdapter availability probe in isolation.
 * Run with tsx so the TypeScript sources resolve.
 */

import { GoogleSheetsAdapter } from '../packages/core/src/adapters/GoogleSheetsAdapter.js';

const id = process.argv[2] ?? '1GNAUy6QoKHUm9DLa3PmhsDoX6iaYr6r5otrjTl8AYiw';
const gid = Number(process.argv[3] ?? 515868842);

const adapter = new GoogleSheetsAdapter({
  spreadsheetId: id,
  gid,
  timeoutMs: 15000,
});

try {
  const rows = await adapter.readRows();
  console.log('readRows OK, rows:', rows.length);
} catch (error) {
  const err = error as { name?: string; message?: string };
  console.log('readRows ERROR:', err.name, '-', err.message);
}

console.log('isAvailable:', await adapter.isAvailable());
