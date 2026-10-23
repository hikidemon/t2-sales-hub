/**
 * The routes of the fallback sign-in and the management of the
 * employee directory.
 *
 * The directory is the trust anchor: a person may enter the cabinet
 * only if the directory knows them. It is managed by the
 * administrator and never leaves the server.
 */

import { Router, type CookieOptions, type Request, type Response } from 'express';
import { z } from 'zod';

import type { AuthService, UserRole } from '@t2-sales-hub/core';

import { HttpError } from '../../shared/errors/HttpError.js';
import { asyncHandler } from '../../shared/middleware/errorHandler.js';
import type { AccessLog } from './audit.js';
import type { EmployeeDirectory } from './directory.js';
import { hasAdminSession } from './guards.js';
import { generatePin, hashPin, isValidPinFormat, PIN_MIN_LENGTH } from './pin.js';
import type { PinAuthService } from './pinService.js';

const signInSchema = z.object({
  identifier: z.string().min(1).max(200),
  pin: z.string().min(1).max(32),
});

const employeeSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  office: z.string().max(200).optional(),
  position: z.string().max(200).optional(),
  roles: z.array(z.enum(['seller', 'curator', 'manager', 'admin'])).min(1),
  pin: z.string().min(PIN_MIN_LENGTH).max(32).optional(),
  active: z.boolean().default(true),
});

export interface AuthRouterOptions {
  authService: AuthService;
  directory: EmployeeDirectory;
  pinService: PinAuthService;
  accessLog: AccessLog;
  /** The methods the client may offer. */
  methods: string[];
  /** The cookie options, shared with the main router. */
  cookieOptions: CookieOptions;
  /** The lifetime of the session cookie, in milliseconds. */
  cookieMaxAge: number;
  /** The secret that signs the cookie. */
  cookieSecret: string;
  /** Writes the session cookie. */
  setSessionCookie: (res: Response, value: string) => void;
  /** Clears the session cookie. */
  clearSessionCookie: (res: Response) => void;
}

/**
 * The endpoints of the fallback sign-in and the directory.
 */
export function createPinAuthRouter(options: AuthRouterOptions): Router {
  const router = Router();

  /**
   * POST /api/auth/pin/sign-in — the sign-in with a name and a PIN.
   */
  router.post(
    '/pin/sign-in',
    asyncHandler(async (req, res) => {
      const parsed = signInSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, 'Укажите имя и ПИН', 'invalid_payload');
      }

      const result = await options.pinService.signIn(
        parsed.data.identifier,
        parsed.data.pin,
        req.ip
      );

      if (!result.ok || !result.session) {
        res.status(401).json({
          error: {
            code: 'unauthorized',
            message: result.reason ?? 'Неверное имя или ПИН.',
          },
          ...(result.remaining !== undefined ? { remaining: result.remaining } : {}),
          ...(result.lockedUntil ? { lockedUntil: result.lockedUntil } : {}),
        });
        return;
      }

      options.setSessionCookie(res, result.session.id);

      res.json({
        user: result.session.user,
        expiresAt: result.session.expiresAt,
      });
    })
  );

  /**
   * GET /api/auth/employees — the directory, for the administrator.
   */
  router.get(
    '/employees',
    asyncHandler(async (req, res) => {
      requireAdministrator(req);
      res.json({ items: options.directory.list() });
    })
  );

  /**
   * POST /api/auth/employees — adds or changes an employee.
   *
   * When no PIN is given, a new one is generated and returned once —
   * the administrator passes it to the person.
   */
  router.post(
    '/employees',
    asyncHandler(async (req, res) => {
      requireAdministrator(req);

      const parsed = employeeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(
          400,
          parsed.error.issues.map((issue) => issue.message).join('; '),
          'invalid_payload'
        );
      }

      const input = parsed.data;
      const existing = options.directory.findById(input.id);

      let pin: string | undefined = input.pin;
      if (!pin && !existing) {
        pin = generatePin(6);
      }
      if (pin && !isValidPinFormat(pin)) {
        throw new HttpError(
          400,
          `ПИН должен состоять из ${PIN_MIN_LENGTH}–12 цифр`,
          'invalid_payload'
        );
      }

      const pinHash = pin ? hashPin(pin) : (existing?.pinHash ?? '');

      const record = await options.directory.upsert({
        id: input.id,
        name: input.name,
        ...(input.office ? { office: input.office } : {}),
        ...(input.position ? { position: input.position } : {}),
        roles: input.roles as UserRole[],
        pinHash,
        active: input.active,
      });

      res.status(existing ? 200 : 201).json({
        employee: {
          id: record.id,
          name: record.name,
          office: record.office,
          position: record.position,
          roles: record.roles,
          active: record.active,
          updatedAt: record.updatedAt,
        },
        // The generated PIN is shown once and never stored in clear text.
        ...(pin && !input.pin ? { generatedPin: pin } : {}),
      });
    })
  );

  /**
   * PATCH /api/auth/employees/:id — activates, deactivates or resets
   * the PIN of an employee.
   */
  router.patch(
    '/employees/:id',
    asyncHandler(async (req, res) => {
      requireAdministrator(req);

      const id = readEmployeeId(req);
      const existing = options.directory.findById(id);
      if (!existing) {
        throw new HttpError(404, 'Сотрудник не найден', 'employee_not_found');
      }

      const body = req.body as {
        active?: boolean;
        resetPin?: boolean;
        roles?: UserRole[];
      };

      if (typeof body.active === 'boolean') {
        await options.directory.setActive(id, body.active);
      }

      let generatedPin: string | undefined;
      if (body.resetPin) {
        generatedPin = generatePin(6);
        await options.directory.upsert({
          ...existing,
          pinHash: hashPin(generatedPin),
        });
      }

      if (body.roles) {
        await options.directory.upsert({ ...existing, roles: body.roles });
      }

      const record = options.directory.findById(id);
      res.json({
        employee: record
          ? {
              id: record.id,
              name: record.name,
              office: record.office,
              position: record.position,
              roles: record.roles,
              active: record.active,
              updatedAt: record.updatedAt,
            }
          : null,
        ...(generatedPin ? { generatedPin } : {}),
      });
    })
  );

  /**
   * DELETE /api/auth/employees/:id — removes an employee.
   */
  router.delete(
    '/employees/:id',
    asyncHandler(async (req, res) => {
      requireAdministrator(req);

      const removed = await options.directory.remove(readEmployeeId(req));
      if (!removed) {
        throw new HttpError(404, 'Сотрудник не найден', 'employee_not_found');
      }
      res.json({ ok: true });
    })
  );

  /**
   * GET /api/auth/access-log — the recent sign-in attempts.
   */
  router.get(
    '/access-log',
    asyncHandler(async (req, res) => {
      requireAdministrator(req);
      res.json({ items: await options.accessLog.read(200) });
    })
  );

  return router;
}

/** Only an administrator may manage the directory. */
function requireAdministrator(req: Request): void {
  if (!hasAdminSession(req)) {
    throw new HttpError(403, 'Управление справочником доступно только администратору', 'forbidden');
  }
}

/** Reads the identifier of the employee from the path. */
function readEmployeeId(req: Request): string {
  const id = req.params.id;
  if (!id) {
    throw new HttpError(400, 'Не указан сотрудник', 'invalid_payload');
  }
  return id;
}
