import { describe, expect, it } from 'vitest';

import type { AuthUser } from '@t2-sales-hub/core';

import { hasAdminSession, hasCuratorSession } from './guards.js';

function requestWith(user: AuthUser | undefined) {
  return { user } as unknown as Parameters<typeof hasCuratorSession>[0];
}

const SELLER: AuthUser = {
  id: '1',
  provider: 'abc-t2',
  displayName: 'Продавец',
  roles: ['seller'],
};

const CURATOR: AuthUser = { ...SELLER, roles: ['seller', 'curator'] };
const ADMIN: AuthUser = { ...SELLER, roles: ['seller', 'admin'] };

describe('hasCuratorSession', () => {
  it('is false without a user', () => {
    expect(hasCuratorSession(requestWith(undefined))).toBe(false);
  });

  it('is false for a seller', () => {
    expect(hasCuratorSession(requestWith(SELLER))).toBe(false);
  });

  it('is true for a curator', () => {
    expect(hasCuratorSession(requestWith(CURATOR))).toBe(true);
  });

  it('is true for an administrator', () => {
    expect(hasCuratorSession(requestWith(ADMIN))).toBe(true);
  });
});

describe('hasAdminSession', () => {
  it('is false without a user', () => {
    expect(hasAdminSession(requestWith(undefined))).toBe(false);
  });

  it('is false for a curator', () => {
    expect(hasAdminSession(requestWith(CURATOR))).toBe(false);
  });

  it('is true for an administrator', () => {
    expect(hasAdminSession(requestWith(ADMIN))).toBe(true);
  });
});
