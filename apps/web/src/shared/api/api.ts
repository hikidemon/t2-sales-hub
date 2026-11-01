/**
 * T2 Sales Hub — API client для SQLite backend.
 * Все запросы идут на локальный сервер, Google Sheets не используется.
 * Нет демо-режима, нет фолбэка на mock-данные.
 */

const API_BASE = '/api';

export interface ApiErrorBody {
  error?: { message?: string };
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body.error?.message) {
        message = body.error.message;
      }
    } catch {
      // Не JSON — оставляем общий текст.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

// ============================================================
// АВТОРИЗАЦИЯ
// ============================================================

export interface LoginRequest {
  firstName: string;
  lastName: string;
  pin: string;
}

export interface LoginResponse {
  user: {
    id: number;
    fullName: string;
    lastName: string;
    role: string;
    position: string;
    region: string;
    pointOfSale: string;
  };
}

export interface UserProfile {
  id: number;
  fullName: string;
  lastName: string;
  role: string;
  position: string;
  region: string;
  pointOfSale: string;
}

export async function apiLogin(
  credentials: LoginRequest
): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function apiMe(): Promise<UserProfile> {
  return request<UserProfile>('/auth/me');
}

export async function apiLogout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' });
}

// ============================================================
// ДЭШБОАРД
// ============================================================

export interface DashboardData {
  period: string;
  income: {
    total: number;
    breakdown: {
      bonuses: number;
      products: number;
    };
  };
  planPerformance: {
    actual: number;
    target: number;
    progress: number;
  };
  ranking: Array<{
    position: number;
    employeeId: number;
    name: string;
    role: string;
    position: string;
    sales: number;
  }>;
  salesChart: Array<{
    date: string;
    amount: number;
    employees: number;
  }>;
  motivation: Array<{
    employeeId: number;
    name: string;
    role: string;
    currentSales: number;
    status: string;
    nextGoal: string;
  }>;
}

export interface DashboardResponse {
  data: DashboardData;
}

export async function apiDashboard(period?: string): Promise<DashboardResponse> {
  const query = period ? `?period=${encodeURIComponent(period)}` : '';
  return request<DashboardResponse>(`/dashboard${query}`);
}

export async function apiEmployees(): Promise<{
  employees: Array<{
    id: number;
    name: string;
    role: string;
    position: string;
    region: string;
    pointOfSale: string;
    status: string;
  }>;
}> {
  return request('/dashboard/employees');
}

export async function apiEmployee(id: number): Promise<{
  employee: {
    id: number;
    fullName: string;
    role: string;
    position: string;
    region: string;
    pointOfSale: string;
  };
  totalSales: number;
  sales: Array<any>;
}> {
  return request(`/dashboard/employee/${id}`);
}

export async function apiHealth(): Promise<{ status: string; database: string; source: string }> {
  return request('/api/health');
}
