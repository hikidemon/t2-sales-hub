/**
 * The client of the employee directory.
 *
 * Only the administrator may use it; the server checks the role on
 * every endpoint.
 */

import type { UserRole } from '@t2-sales-hub/core';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    ...init,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

/** One employee of the directory, without the PIN. */
export interface EmployeeSummary {
  id: string;
  name: string;
  office?: string;
  position?: string;
  roles: UserRole[];
  active: boolean;
  updatedAt: string;
}

/** One record of the access log. */
export interface AccessRecord {
  at: string;
  event: string;
  provider: string;
  identifier: string;
  success: boolean;
  ip?: string;
  reason?: string;
  role?: string;
}

/** The employees of the directory. */
export async function listEmployees(): Promise<EmployeeSummary[]> {
  try {
    const response = await request<{ items: EmployeeSummary[] }>('/auth/employees');
    return response.items;
  } catch {
    return [];
  }
}

/** The recent sign-in attempts. */
export async function listAccessLog(): Promise<AccessRecord[]> {
  try {
    const response = await request<{ items: AccessRecord[] }>('/auth/access-log');
    return response.items;
  } catch {
    return [];
  }
}

/** Adds an employee; the generated PIN comes back once. */
export async function saveEmployee(input: {
  id: string;
  name: string;
  office?: string;
  position?: string;
  roles: UserRole[];
}): Promise<{ employee: EmployeeSummary | null; generatedPin?: string }> {
  return request('/auth/employees', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Activates or deactivates an employee. */
export async function setEmployeeActive(id: string, active: boolean): Promise<void> {
  await request(`/auth/employees/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

/** Issues a new PIN; it comes back once. */
export async function resetEmployeePin(id: string): Promise<{ generatedPin?: string }> {
  return request(`/auth/employees/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ resetPin: true }),
  });
}

/** Removes an employee from the directory. */
export async function removeEmployee(id: string): Promise<void> {
  await request(`/auth/employees/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
