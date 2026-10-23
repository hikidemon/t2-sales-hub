import { describe, expect, it } from 'vitest';

import { createAdapter, describeIntegrations, KNOWN_SYSTEMS } from './registry.js';

describe('integration registry', () => {
  it('reports a system without access as not configured', async () => {
    const adapter = createAdapter('abc-t2', false);

    expect(await adapter.isAvailable()).toBe(false);
    expect(await adapter.describeUnavailableReason()).toContain('ABC T2');
  });

  it('lists the requirements that are still missing', async () => {
    const adapters = new Map([['abc-t2' as const, createAdapter('abc-t2' as const, false)]]);

    const descriptors = await describeIntegrations(adapters);
    const abc = descriptors.find((item) => item.kind === 'abc-t2');

    expect(abc?.state).toBe('not-configured');
    expect(abc?.missingRequirements.length).toBeGreaterThan(0);
    expect(abc?.requiresCredentials).toBe(true);
  });

  it('never reports a configured system as a placeholder', async () => {
    // A configured system must not be described by the "pending" adapter:
    // the interface would show a working integration as unavailable.
    const adapter = createAdapter('google-sheets', true);
    const reason = await adapter.describeUnavailableReason();

    // The Sheets adapter reports a concrete reason, never a requirement list.
    expect(reason === null || !reason.includes('Доступ')).toBe(true);
  });

  it('knows every external system the project targets', () => {
    const kinds = KNOWN_SYSTEMS.map((system) => system.kind);
    expect(kinds).toContain('abc-t2');
    expect(kinds).toContain('onec');
    expect(kinds).toContain('google-sheets');
  });
});
