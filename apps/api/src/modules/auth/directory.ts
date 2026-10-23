/**
 * The employee directory.
 *
 * This is the trust anchor of the fallback sign-in: a person may enter
 * the cabinet only if the directory knows them. The directory holds the
 * employees of the company — their name, their trading point, their
 * role and whether the account is active.
 *
 * The file never leaves the server: it is written to `.data/`, which is
 * git-ignored, and it is never sent to the browser. The browser only
 * learns whether the sign-in succeeded.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { UserRole } from '@t2-sales-hub/core';

/** One employee of the directory. */
export interface EmployeeRecord {
  /** Stable identifier of the record. */
  id: string;
  /** Full name as it is written in the directory. */
  name: string;
  /** Trading point or office. */
  office?: string;
  /** Position. */
  position?: string;
  /** The roles the person holds. */
  roles: UserRole[];
  /** The hashed PIN. Never the PIN itself. */
  pinHash: string;
  /** An inactive account cannot sign in. */
  active: boolean;
  /** When the record was created. */
  createdAt: string;
  /** When the record was changed. */
  updatedAt: string;
}

interface DirectoryFile {
  version: number;
  employees: EmployeeRecord[];
}

export interface EmployeeDirectoryOptions {
  /** Where the directory is stored. */
  filePath: string;
}

/**
 * The directory of the employees who may sign in.
 */
export class EmployeeDirectory {
  private employees: EmployeeRecord[] = [];
  private readonly filePath: string;

  constructor(options: EmployeeDirectoryOptions) {
    this.filePath = options.filePath;
  }

  /** Reads the directory from disk. A missing file means an empty one. */
  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      if (!raw.trim()) {
        this.employees = [];
        return;
      }
      const parsed = JSON.parse(raw) as DirectoryFile;
      this.employees = Array.isArray(parsed.employees) ? parsed.employees : [];
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        this.employees = [];
        return;
      }
      throw error;
    }
  }

  /** Writes the directory to disk, atomically. */
  async save(): Promise<void> {
    const payload: DirectoryFile = { version: 1, employees: this.employees };
    await mkdir(dirname(this.filePath), { recursive: true });

    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(payload, null, 2), 'utf8');
    await rename(temporaryPath, this.filePath);
  }

  /** Every record, without the PIN hashes. */
  list(): Omit<EmployeeRecord, 'pinHash'>[] {
    return this.employees.map(({ pinHash: _pinHash, ...rest }) => rest);
  }

  /** The number of records. */
  get size(): number {
    return this.employees.length;
  }

  /**
   * Finds an employee by name.
   *
   * The comparison ignores case, extra spaces and the «ё»/«е»
   * difference — people type their names differently. A person may
   * also write only the surname: the match then has to be unambiguous,
   * otherwise the sign-in is refused.
   */
  findByName(name: string): EmployeeRecord | undefined {
    const target = normalizeName(name);
    if (!target) return undefined;

    const exact = this.employees.find((employee) => normalizeName(employee.name) === target);
    if (exact) return exact;

    // «Иванова» or «Иванова Пётр» — the written name starts with
    // what the person typed.
    const candidates = this.employees.filter((employee) =>
      normalizeName(employee.name).startsWith(`${target} `)
    );

    // Only an unambiguous match is accepted: two people with the same
    // surname must not be able to sign in as each other.
    return candidates.length === 1 ? candidates[0] : undefined;
  }

  /** The record with the given identifier. */
  findById(id: string): EmployeeRecord | undefined {
    return this.employees.find((employee) => employee.id === id);
  }

  /** Adds or replaces a record. */
  async upsert(record: Omit<EmployeeRecord, 'createdAt' | 'updatedAt'>): Promise<EmployeeRecord> {
    const now = new Date().toISOString();
    const existing = this.findById(record.id);
    const stored: EmployeeRecord = {
      ...record,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.employees = this.employees.filter((employee) => employee.id !== record.id);
    this.employees.push(stored);
    await this.save();
    return stored;
  }

  /** Removes a record. */
  async remove(id: string): Promise<boolean> {
    const before = this.employees.length;
    this.employees = this.employees.filter((employee) => employee.id !== id);
    if (this.employees.length === before) return false;
    await this.save();
    return true;
  }

  /** Marks a record as active or inactive. */
  async setActive(id: string, active: boolean): Promise<EmployeeRecord | undefined> {
    const employee = this.findById(id);
    if (!employee) return undefined;
    employee.active = active;
    employee.updatedAt = new Date().toISOString();
    await this.save();
    return employee;
  }
}

/**
 * Normalises a name for the comparison: lowercase, «ё» as «е»,
 * spaces and hyphens collapsed.
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/ё/g, 'е').replace(/[-–—]/g, ' ').replace(/\s+/g, ' ');
}
