import { describe, expect, it } from 'vitest';

import type { AuthUser } from '@t2-sales-hub/core';

import { assignRoles } from './roles.js';

const USER: AuthUser = {
  id: '4711',
  provider: 'abc-t2',
  displayName: 'Иванова Пётр Петрович',
  login: 'i.petrova',
  email: 'i.petrova@t2.ru',
  roles: ['seller'],
};

describe('assignRoles', () => {
  it('keeps the roles of the portal when nothing is configured', () => {
    const result = assignRoles(USER, {});

    expect(result.roles).toEqual(['seller']);
    expect(result).toBe(USER);
  });

  it('adds the administrator role by the login', () => {
    const result = assignRoles(USER, { adminLogins: 'i.petrova' });

    expect(result.roles).toContain('admin');
    expect(result.roles).toContain('seller');
  });

  it('adds the administrator role by the e-mail', () => {
    const result = assignRoles(USER, { adminLogins: 'I.Petrova@T2.ru' });

    expect(result.roles).toContain('admin');
  });

  it('adds the curator role', () => {
    const result = assignRoles(USER, { curatorLogins: 'i.petrova' });

    expect(result.roles).toContain('curator');
    expect(result.roles).not.toContain('admin');
  });

  it('accepts several logins separated by commas', () => {
    const result = assignRoles(USER, {
      adminLogins: 'someone.else, i.petrova ,another',
    });

    expect(result.roles).toContain('admin');
  });

  it('does not touch a user who is not listed', () => {
    const result = assignRoles(USER, { adminLogins: 'someone.else' });

    expect(result.roles).toEqual(['seller']);
  });

  it('never takes a role away', () => {
    const admin: AuthUser = { ...USER, roles: ['seller', 'admin'] };
    const result = assignRoles(admin, { curatorLogins: 'i.petrova' });

    expect(result.roles).toContain('admin');
    expect(result.roles).toContain('curator');
  });

  it('does not match a login that only looks similar', () => {
    // «i.petrov» is not «i.petrova» — the comparison is exact.
    const result = assignRoles(USER, { adminLogins: 'i.petrov' });

    expect(result.roles).toEqual(['seller']);
  });
});
