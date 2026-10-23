/**
 * The fallback sign-in: name + PIN, checked against the directory.
 *
 * This is the option that works without any corporate access. The
 * person identifies themselves with their name and a personal PIN that
 * the administrator issued; the name is looked up in the employee
 * directory, and the PIN is compared with the stored hash.
 *
 * The answer is always the same for the wrong name and the wrong PIN:
 * the client learns nothing about which part was wrong.
 */

import type { AuthService, AuthUser, UserRole } from '@t2-sales-hub/core';

import type { AccessLog } from './audit.js';
import type { EmployeeDirectory } from './directory.js';
import { verifyPin } from './pin.js';
import type { AttemptLimiter } from './rateLimit.js';

export interface PinAuthOptions {
  directory: EmployeeDirectory;
  limiter: AttemptLimiter;
  accessLog: AccessLog;
  authService: AuthService;
  /**
   * The logins that hold an extra role.
   *
   * The role of the directory is never taken away — the environment can
   * only add one, the same way it works for the portal sign-in.
   */
  adminLogins?: string;
  curatorLogins?: string;
}

export interface PinSignInResult {
  ok: boolean;
  /** The session, when the sign-in succeeded. */
  session?: Awaited<ReturnType<AuthService['createLocalSession']>>;
  /** The reason, for the log and for the interface. */
  reason?: string;
  /** How many attempts are left before the block. */
  remaining?: number;
  /** When the block ends, in milliseconds. */
  lockedUntil?: number;
}

export class PinAuthService {
  constructor(private readonly options: PinAuthOptions) {}

  /**
   * Signs a person in.
   *
   * The identifier and the PIN are both checked, but the answer does
   * not say which of them was wrong.
   */
  async signIn(identifier: string, pin: string, ip?: string): Promise<PinSignInResult> {
    const name = identifier.trim();
    const addressKey = `ip:${ip ?? 'unknown'}`;
    const nameKey = `name:${name.toLowerCase()}`;

    for (const key of [nameKey, addressKey]) {
      if (this.options.limiter.isBlocked(key)) {
        const state = this.options.limiter.state(key);
        await this.options.accessLog.write({
          event: 'locked',
          provider: 'pin',
          identifier: name,
          success: false,
          ...(ip ? { ip } : {}),
          reason: 'blocked',
        });
        return {
          ok: false,
          reason: 'Слишком много попыток. Вход временно заблокирован.',
          remaining: 0,
          lockedUntil: state.lockedUntil,
        };
      }
    }

    const employee = this.options.directory.findByName(name);
    const pinMatches = employee ? verifyPin(pin, employee.pinHash) : false;

    if (!employee || !employee.active || !pinMatches) {
      // The same treatment for an unknown name and a wrong PIN.
      for (const key of [nameKey, addressKey]) {
        this.options.limiter.fail(key);
      }

      await this.options.accessLog.write({
        event: 'sign-in-failed',
        provider: 'pin',
        identifier: name,
        success: false,
        ...(ip ? { ip } : {}),
        reason: employee ? 'wrong-pin' : 'unknown-name',
      });

      const state = this.options.limiter.state(nameKey);
      return {
        ok: false,
        reason: 'Неверное имя или ПИН.',
        remaining: state.remaining,
        ...(state.lockedUntil ? { lockedUntil: state.lockedUntil } : {}),
      };
    }

    for (const key of [nameKey, addressKey]) {
      this.options.limiter.succeed(key);
    }

    const user: AuthUser = {
      id: employee.id,
      provider: 'pin',
      displayName: employee.name,
      ...(employee.position ? { position: employee.position } : {}),
      ...(employee.office ? { region: employee.office } : {}),
      roles: this.rolesOf(employee),
      raw: { source: 'directory', office: employee.office },
    };

    const session = await this.options.authService.createLocalSession(user);

    await this.options.accessLog.write({
      event: 'sign-in',
      provider: 'pin',
      identifier: employee.name,
      success: true,
      ...(ip ? { ip } : {}),
      // The effective roles — the ones the person actually acts with.
      role: user.roles.join(', '),
    });

    return { ok: true, session };
  }

  /** The roles a person may be given in the directory. */
  static isKnownRole(value: string): value is UserRole {
    return ['seller', 'curator', 'manager', 'admin'].includes(value);
  }

  /**
   * The roles of the person: the ones of the directory plus the ones
   * the environment grants by the name.
   *
   * The name is matched the same way as the login of the portal: the
   * comparison ignores the case and the «ё»/«е» difference.
   */
  private rolesOf(employee: { name: string; roles: UserRole[] }): UserRole[] {
    const roles = new Set<UserRole>(employee.roles);
    const identity = employee.name.trim().toLowerCase().replace(/ё/g, 'е');

    const matches = (list: string | undefined) =>
      (list ?? '')
        .split(',')
        .map((value) => value.trim().toLowerCase().replace(/ё/g, 'е'))
        .filter(Boolean)
        .some((value) => value === identity);

    if (matches(this.options.adminLogins)) roles.add('admin');
    if (matches(this.options.curatorLogins)) roles.add('curator');

    return Array.from(roles);
  }
}
