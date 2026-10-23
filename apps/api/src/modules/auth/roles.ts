/**
 * Role assignment.
 *
 * The ABC T2 portal issues the roles of a person. Until the access to
 * the portal is granted, and for the accounts that exist only inside
 * the company, the role can also be assigned by the corporate login.
 *
 * The list lives in the environment, not in the code: `AUTH_ADMIN_LOGINS`
 * and `AUTH_CURATOR_LOGINS` hold the logins or the e-mail addresses
 * separated by commas.
 */

import type { AuthUser, UserRole } from '@t2-sales-hub/core';

/** Normalises a login or an e-mail for the comparison. */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export interface RoleAssignmentOptions {
  /** The logins that hold the administrator role. */
  adminLogins?: string;
  /** The logins that hold the curator role. */
  curatorLogins?: string;
}

/**
 * Adds the roles the environment grants to the user.
 *
 * The roles of the portal are never taken away: the environment can
 * only add.
 */
export function assignRoles(user: AuthUser, options: RoleAssignmentOptions): AuthUser {
  const admin = new Set((options.adminLogins ?? '').split(',').map(normalize).filter(Boolean));
  const curator = new Set((options.curatorLogins ?? '').split(',').map(normalize).filter(Boolean));

  const identities = [user.login, user.email]
    .filter((value): value is string => typeof value === 'string')
    .map(normalize);

  const roles = new Set<UserRole>(user.roles);

  if (identities.some((identity) => admin.has(identity))) {
    roles.add('admin');
  }
  if (identities.some((identity) => curator.has(identity))) {
    roles.add('curator');
  }

  if (roles.size === user.roles.length) {
    return user;
  }

  return { ...user, roles: Array.from(roles) };
}
