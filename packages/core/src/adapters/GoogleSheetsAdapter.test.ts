import { describe, expect, it } from 'vitest';

import { buildGvizUrl, GoogleSheetsAdapter, parseCsv } from './GoogleSheetsAdapter';

describe('buildGvizUrl', () => {
  it('builds the gviz endpoint for a sheet gid', () => {
    expect(buildGvizUrl({ spreadsheetId: 'ABC123', gid: 515868842 })).toBe(
      'https://docs.google.com/spreadsheets/d/ABC123/gviz/tq?tqx=out:csv&gid=515868842'
    );
  });

  it('falls back to the first sheet for an invalid gid', () => {
    expect(buildGvizUrl({ spreadsheetId: 'ABC123', gid: Number.NaN })).toContain('gid=0');
  });
});

describe('parseCsv', () => {
  it('parses quoted fields and empty columns', () => {
    const rows = parseCsv('"Новосибирск","","91"\n"Сим","91","68"\n');
    expect(rows).toEqual([
      ['Новосибирск', '', '91'],
      ['Сим', '91', '68'],
    ]);
  });

  it('unescapes doubled quotes', () => {
    const rows = parseCsv('"он сказал ""да"""\n');
    expect(rows[0]?.[0]).toBe('он сказал "да"');
  });

  it('handles \r\n line endings', () => {
    const rows = parseCsv('"a","b"\r\n"c","d"\r\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('returns an empty array for an empty document', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('GoogleSheetsAdapter', () => {
  it('reads and parses the sheet through the injected fetch', async () => {
    const fetchImpl = (async () =>
      new Response('"Новосибирск"\n"Сим","91","68"\n', {
        status: 200,
        headers: { 'content-type': 'text/csv' },
      })) as unknown as typeof fetch;

    const adapter = new GoogleSheetsAdapter({
      spreadsheetId: 'ABC123',
      gid: 1,
      fetchImpl,
    });

    const rows = await adapter.readRows();
    expect(rows[0]?.[0]).toBe('Новосибирск');
    expect(rows[1]?.[1]).toBe('91');
  });

  it('reports availability as false when the source fails', async () => {
    const fetchImpl = (async () =>
      new Response('nope', { status: 410 })) as unknown as typeof fetch;

    const adapter = new GoogleSheetsAdapter({
      spreadsheetId: 'ABC123',
      gid: 1,
      fetchImpl,
    });

    await expect(adapter.isAvailable()).resolves.toBe(false);
  });

  it('throws a typed error for a non-OK response', async () => {
    const fetchImpl = (async () =>
      new Response('gone', { status: 410 })) as unknown as typeof fetch;

    const adapter = new GoogleSheetsAdapter({
      spreadsheetId: 'ABC123',
      gid: 1,
      fetchImpl,
    });

    await expect(adapter.readRows()).rejects.toThrow(/410/);
  });
});
