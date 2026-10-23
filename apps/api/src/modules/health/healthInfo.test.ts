import { describe, expect, it } from 'vitest';

import { buildHealthInfo } from './healthInfo';

describe('buildHealthInfo', () => {
  it('returns ok status and demo flag', () => {
    const info = buildHealthInfo(new Date('2026-10-14T12:00:00Z'));
    expect(info.status).toBe('ok');
    expect(info.demo).toBe(true);
  });

  it('serializes the provided timestamp as ISO string', () => {
    const info = buildHealthInfo(new Date('2026-10-14T12:00:00Z'));
    expect(info.timestamp).toBe('2026-10-14T12:00:00.000Z');
  });
});
