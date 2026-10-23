import { describe, expect, it } from 'vitest';

import type { UserRole } from '@t2-sales-hub/core';

import {
  adminNavItems,
  curatorNavItems,
  isNavItemVisible,
  mainNavItems,
  visibleNavItems,
} from './navigation.js';

describe('isNavItemVisible', () => {
  it('shows an item without roles to everyone', () => {
    const item = mainNavItems[0]!;
    expect(item.roles).toBeUndefined();
    expect(isNavItemVisible(item, [])).toBe(true);
    expect(isNavItemVisible(item, ['admin'])).toBe(true);
  });

  it('hides a role item from a user without that role', () => {
    const item = adminNavItems[0]!;

    expect(isNavItemVisible(item, [])).toBe(false);
    expect(isNavItemVisible(item, ['seller'])).toBe(false);
    expect(isNavItemVisible(item, ['curator'])).toBe(false);
  });

  it('shows a role item to a user with that role', () => {
    expect(isNavItemVisible(adminNavItems[0]!, ['admin'])).toBe(true);
    expect(isNavItemVisible(curatorNavItems[0]!, ['curator'])).toBe(true);
  });
});

describe('visibleNavItems', () => {
  it('shows only the common items to a seller', () => {
    const keys = visibleNavItems(['seller']).map((item) => item.key);

    expect(keys).toContain('home');
    expect(keys).not.toContain('curator');
    expect(keys).not.toContain('admin');
  });

  it('shows the curator section to a curator', () => {
    const keys = visibleNavItems(['curator']).map((item) => item.key);

    expect(keys).toContain('curator');
    expect(keys).not.toContain('admin');
  });

  it('shows both sections to an administrator', () => {
    const keys = visibleNavItems(['admin']).map((item) => item.key);

    expect(keys).toContain('curator');
    expect(keys).toContain('admin');
  });

  it('shows the common items to a user without a session', () => {
    const roles: UserRole[] = [];
    const keys = visibleNavItems(roles).map((item) => item.key);

    expect(keys).toEqual(mainNavItems.map((item) => item.key));
  });
});
