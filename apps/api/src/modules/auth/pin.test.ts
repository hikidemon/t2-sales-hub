import { describe, expect, it } from 'vitest';

import { generatePin, hashPin, isValidPinFormat, PIN_MIN_LENGTH, verifyPin } from './pin.js';

describe('hashPin', () => {
  it('never stores the PIN itself', () => {
    const hash = hashPin('1234');

    expect(hash).not.toContain('1234');
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  it('produces a different hash every time', () => {
    expect(hashPin('1234')).not.toBe(hashPin('1234'));
  });

  it('verifies the right PIN', () => {
    const hash = hashPin('482913');
    expect(verifyPin('482913', hash)).toBe(true);
  });

  it('rejects a wrong PIN', () => {
    const hash = hashPin('482913');
    expect(verifyPin('482914', hash)).toBe(false);
    expect(verifyPin('', hash)).toBe(false);
  });

  it('rejects a broken hash', () => {
    expect(verifyPin('1234', 'garbage')).toBe(false);
    expect(verifyPin('1234', '')).toBe(false);
    expect(verifyPin('1234', 'scrypt$only')).toBe(false);
  });
});

describe('generatePin', () => {
  it('creates a PIN of the requested length', () => {
    expect(generatePin(6)).toHaveLength(6);
    expect(generatePin(4)).toHaveLength(4);
  });

  it('uses only digits that are not confused with letters', () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(generatePin(6)).toMatch(/^[2-9]{6}$/);
    }
  });

  it('creates a different PIN every time', () => {
    const pins = new Set(Array.from({ length: 20 }, () => generatePin(6)));
    expect(pins.size).toBeGreaterThan(15);
  });
});

describe('isValidPinFormat', () => {
  it('accepts a PIN of the allowed length', () => {
    expect(isValidPinFormat('1234')).toBe(true);
    expect(isValidPinFormat('123456789012')).toBe(true);
  });

  it('rejects a too short PIN', () => {
    expect(isValidPinFormat('123'.padEnd(PIN_MIN_LENGTH - 1, '0'))).toBe(false);
  });

  it('rejects a PIN with letters', () => {
    expect(isValidPinFormat('12a4')).toBe(false);
  });
});
