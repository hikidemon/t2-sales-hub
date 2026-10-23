/**
 * PIN hashing.
 *
 * A PIN is a password in every respect that matters, so it is never
 * stored as it is: only a salted scrypt hash. The salt is per employee
 * and travels with the hash, so a stolen file cannot be attacked with
 * a common rainbow table.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/** The shortest PIN the application accepts. */
export const PIN_MIN_LENGTH = 4;

/** The longest PIN the application accepts. */
export const PIN_MAX_LENGTH = 12;

/** The cost of the scrypt derivation. */
const KEY_LENGTH = 32;

/**
 * Hashes a PIN.
 *
 * The result is `scrypt$<salt>$<hash>` — both parts are base64.
 */
export function hashPin(pin: string, salt?: string): string {
  const saltBuffer = salt ? Buffer.from(salt, 'base64') : randomBytes(16);
  const derived = scryptSync(pin.normalize('NFKC'), saltBuffer, KEY_LENGTH);
  return `scrypt$${saltBuffer.toString('base64')}$${derived.toString('base64')}`;
}

/**
 * Checks a PIN against a stored hash.
 *
 * The comparison takes the same time whether the PIN is right or not.
 */
export function verifyPin(pin: string, stored: string): boolean {
  if (!stored) return false;

  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const salt = parts[1] as string;
  const expected = Buffer.from(parts[2] as string, 'base64');
  const derived = scryptSync(pin.normalize('NFKC'), Buffer.from(salt, 'base64'), KEY_LENGTH);

  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/** Generates a PIN that is easy to read aloud and to type. */
export function generatePin(length = 6): string {
  const alphabet = '23456789';
  const bytes = randomBytes(length);
  let pin = '';
  for (let index = 0; index < length; index += 1) {
    pin += alphabet[(bytes[index] as number) % alphabet.length];
  }
  return pin;
}

/** True when the PIN satisfies the length rules. */
export function isValidPinFormat(pin: string): boolean {
  return pin.length >= PIN_MIN_LENGTH && pin.length <= PIN_MAX_LENGTH && /^[0-9]+$/.test(pin);
}
