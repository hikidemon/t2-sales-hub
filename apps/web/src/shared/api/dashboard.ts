/**
 * Access to the seller dashboard dataset.
 *
 * The app talks to the server API, never to Google Sheets directly —
 * no secret ever reaches the browser. The server decides which source
 * to serve (mock or Google Sheets) and returns the cached snapshot.
 *
 * When the API is unreachable the app falls back to the local mock
 * adapter, so the interface stays demonstrable offline.
 */

import {
  MockDashboardAdapter,
  type AppNotification,
  type DashboardData,
  type ExternalSystemKind,
  type IntegrationDescriptor,
  type NotificationSummary,
  type Period,
  type QuizTest,
  type SyncStatus,
  type TestWithState,
} from '@t2-sales-hub/core';

/** Base URL of the API. The Vite dev server proxies `/api` to the API. */
const API_BASE = '/api';

export interface DashboardResponse {
  data: DashboardData;
  meta: {
    capturedAt: string;
    source: 'mock' | 'google-sheets';
    status: SyncStatus;
  };
}

export interface NotificationResponse {
  items: AppNotification[];
  summary: NotificationSummary;
}

export interface TestsResponse {
  items: TestWithState[];
}

export interface IntegrationsResponse {
  items: IntegrationDescriptor[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) {
        message = body.error.message;
      }
    } catch {
      // The body is not JSON — keep the generic message.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

const fallbackAdapter = new MockDashboardAdapter();

/**
 * Loads the dashboard dataset.
 *
 * A missing period is reported as an error rather than silently falling
 * back to the demo dataset: substituting synthetic figures for live ones
 * would misrepresent the numbers. The local fallback applies only when
 * the API itself is unreachable.
 */
export async function loadDashboard(periodId?: string): Promise<DashboardResponse> {
  const query = periodId ? `?period=${encodeURIComponent(periodId)}` : '';
  try {
    return await request<DashboardResponse>(`/dashboard${query}`);
  } catch (error) {
    // The API answered but the period is not in the snapshot — report it.
    if (error instanceof ApiError) {
      throw error;
    }

    // The API is unavailable — serve the local demo dataset instead.
    const data = await fallbackAdapter.fetchDashboard(periodId);
    return {
      data,
      meta: {
        capturedAt: new Date().toISOString(),
        source: 'mock',
        status: {
          state: 'error',
          source: 'mock',
          lastSuccessAt: null,
          lastAttemptAt: null,
          lastDurationMs: null,
          lastError: 'Сервер данных недоступен — показаны локальные демо-данные',
          consecutiveFailures: 1,
          intervalMs: 300_000,
          servingStaleData: false,
        },
      },
    };
  }
}

/**
 * The periods the current source can serve.
 * Falls back to the local demo list when the API is unreachable.
 */
export async function loadAvailablePeriods(): Promise<Period[]> {
  try {
    const response = await request<{ items: Period[] }>('/dashboard/periods');
    return response.items;
  } catch {
    return fallbackAdapter.listPeriodsSync();
  }
}

/** Loads the status of the sync pipeline. */
export async function loadSyncStatus(): Promise<SyncStatus | null> {
  try {
    return await request<SyncStatus>('/sync/status');
  } catch {
    return null;
  }
}

/** Loads the notifications of the current seller. */
export async function loadNotifications(): Promise<NotificationResponse | null> {
  try {
    return await request<NotificationResponse>('/notifications');
  } catch {
    return null;
  }
}

/** Marks one notification as read. */
export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    await request(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
    });
    return true;
  } catch {
    return false;
  }
}

/** Marks every notification as read. */
export async function markAllNotificationsRead(): Promise<boolean> {
  try {
    await request('/notifications/read-all', { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}

/** Loads the tests assigned to the current seller. */
export async function loadMyTests(): Promise<TestsResponse | null> {
  try {
    return await request<TestsResponse>('/tests/assigned/mine');
  } catch {
    return null;
  }
}

/** Loads every test — the curator view. */
export async function loadAllTests(): Promise<QuizTest[]> {
  try {
    const response = await request<{ items: QuizTest[] }>('/tests');
    return response.items;
  } catch {
    return [];
  }
}

/** Submits the answers of a test and returns the graded attempt. */
export async function submitTestAttempt(
  testId: string,
  answers: Record<string, string>,
  startedAtMs: number
): Promise<{ scorePercent: number; passed: boolean } | null> {
  try {
    const response = await request<{
      attempt: { scorePercent: number; passed: boolean };
    }>(`/tests/${encodeURIComponent(testId)}/attempts`, {
      method: 'POST',
      body: JSON.stringify({ answers, startedAtMs }),
    });
    return response.attempt;
  } catch {
    return null;
  }
}

/** Loads the state of the external systems. */
export async function loadIntegrations(): Promise<IntegrationsResponse | null> {
  try {
    return await request<IntegrationsResponse>('/integrations');
  } catch {
    return null;
  }
}

/** Triggers a manual synchronisation. Requires the server-side token. */
export async function triggerSyncRefresh(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/sync/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-sync-token': token },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Triggers a manual synchronisation as an administrator.
 *
 * The server checks the role from the session — the client sends no
 * secret of its own.
 */
export async function refreshSync(): Promise<{
  ok: boolean;
  durationMs: number;
  error?: string | null;
}> {
  const response = await request<{
    ok: boolean;
    durationMs: number;
    error?: string | null;
  }>('/sync/refresh', { method: 'POST' });

  return response;
}

export type { ExternalSystemKind };
