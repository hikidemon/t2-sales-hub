import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EmployeeDirectory, normalizeName } from './directory.js';
import { hashPin } from './pin.js';

describe('normalizeName', () => {
  it('ignores the case, the spaces and the «ё»', () => {
    expect(normalizeName('  Иванова   Пётр  ')).toBe('иванова петр');
    expect(normalizeName('Иванова Петр')).toBe('иванова петр');
  });

  it('treats a hyphen as a space', () => {
    expect(normalizeName('Иванова-Петрова')).toBe('иванова петрова');
  });
});

describe('EmployeeDirectory', () => {
  let directory: EmployeeDirectory;
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 't2-directory-'));
    directory = new EmployeeDirectory({ filePath: join(root, 'employees.json') });
    await directory.load();
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('starts empty when there is no file', () => {
    expect(directory.size).toBe(0);
    expect(directory.list()).toEqual([]);
  });

  it('adds an employee and finds them by name', async () => {
    await directory.upsert({
      id: 'EMP-001',
      name: 'Иванова Пётр Петрович',
      office: 'Карла Маркса, 7',
      roles: ['seller'],
      pinHash: hashPin('1234'),
      active: true,
    });

    expect(directory.size).toBe(1);

    const found = directory.findByName('  иванова пЁтр петрович ');
    expect(found?.id).toBe('EMP-001');
    expect(found?.office).toBe('Карла Маркса, 7');
  });

  it('keeps the file across a restart', async () => {
    await directory.upsert({
      id: 'EMP-001',
      name: 'Иванова Пётр Петрович',
      roles: ['seller'],
      pinHash: hashPin('1234'),
      active: true,
    });

    const reloaded = new EmployeeDirectory({
      filePath: join(root, 'employees.json'),
    });
    await reloaded.load();

    expect(reloaded.size).toBe(1);
    expect(reloaded.findById('EMP-001')?.name).toBe('Иванова Пётр Петрович');
  });

  it('never returns the PIN hash to the caller', async () => {
    await directory.upsert({
      id: 'EMP-001',
      name: 'Иванова Пётр Петрович',
      roles: ['seller'],
      pinHash: hashPin('1234'),
      active: true,
    });

    const [record] = directory.list();
    expect(record).toBeDefined();
    expect(record).not.toHaveProperty('pinHash');
  });

  it('deactivates an employee', async () => {
    await directory.upsert({
      id: 'EMP-001',
      name: 'Иванова Пётр Петрович',
      roles: ['seller'],
      pinHash: hashPin('1234'),
      active: true,
    });

    await directory.setActive('EMP-001', false);
    expect(directory.findById('EMP-001')?.active).toBe(false);
  });

  it('removes an employee', async () => {
    await directory.upsert({
      id: 'EMP-001',
      name: 'Иванова Пётр Петрович',
      roles: ['seller'],
      pinHash: hashPin('1234'),
      active: true,
    });

    expect(await directory.remove('EMP-001')).toBe(true);
    expect(directory.size).toBe(0);
    expect(await directory.remove('EMP-001')).toBe(false);
  });

  it('replaces a record with the same identifier', async () => {
    await directory.upsert({
      id: 'EMP-001',
      name: 'Иванова Пётр Петрович',
      roles: ['seller'],
      pinHash: hashPin('1234'),
      active: true,
    });

    await directory.upsert({
      id: 'EMP-001',
      name: 'Иванова Пётр Петрович',
      roles: ['curator'],
      pinHash: hashPin('5678'),
      active: true,
    });

    expect(directory.size).toBe(1);
    expect(directory.findById('EMP-001')?.roles).toEqual(['curator']);
  });

  it('finds a person by the surname alone', async () => {
    await directory.upsert({
      id: 'EMP-001',
      name: 'Иванова Пётр Петрович',
      roles: ['seller'],
      pinHash: hashPin('1234'),
      active: true,
    });

    expect(directory.findByName('Иванова')?.id).toBe('EMP-001');
    expect(directory.findByName('иванова петр')?.id).toBe('EMP-001');
  });

  it('refuses an ambiguous surname', async () => {
    await directory.upsert({
      id: 'EMP-001',
      name: 'Иванова Пётр Петрович',
      roles: ['seller'],
      pinHash: hashPin('1234'),
      active: true,
    });
    await directory.upsert({
      id: 'EMP-002',
      name: 'Иванова Ольга Ивановна',
      roles: ['seller'],
      pinHash: hashPin('5678'),
      active: true,
    });

    // Two people share the surname — the sign-in must not pick one.
    expect(directory.findByName('Иванова')).toBeUndefined();
    // The full name is still unambiguous.
    expect(directory.findByName('Иванова Ольга')?.id).toBe('EMP-002');
  });
});
