/**
 * The authentication client.
 *
 * The browser never sees the provider's endpoints or the client
 * secret: it asks the server where to go and receives the profile back.
 */

import type { AuthUser } from '@t2-sales-hub/core';

export interface AuthConfig {
  /** Whether a sign-in is required to use the application. */
  required: boolean;
  /** The provider the application delegates to. */
  provider: 'abc-t2';
  /** Whether the provider is configured on the server. */
  providerConfigured: boolean;
  /** Display name of the provider. */
  providerName: string;
  /** The sign-in methods the server offers. */
  methods?: string[];
}

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

/** Loads the authentication configuration of the server. */
export async function loadAuthConfig(): Promise<AuthConfig | null> {
  try {
    return await request<AuthConfig>('/auth/config');
  } catch {
    return null;
  }
}

/** Loads the signed-in user, or null when there is no session. */
export async function loadCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await request<{ user: AuthUser | null }>('/auth/me');
    return response.user ?? null;
  } catch {
    return null;
  }
}

/** The URL the browser must be sent to in order to sign in. */
export function buildLoginUrl(returnTo?: string): string {
  const base = '/api/auth/abc-t2/login';
  return returnTo ? `${base}?returnTo=${encodeURIComponent(returnTo)}` : base;
}

/**
 * Signs in with a name and a PIN.
 *
 * Returns the reason of the refusal, or null when the sign-in worked.
 */
export async function signInWithPin(identifier: string, pin: string): Promise<string | null> {
  try {
    await request<{ user: AuthUser }>('/auth/pin/sign-in', {
      method: 'POST',
      body: JSON.stringify({ identifier, pin }),
    });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Неверное имя или ПИН.';
  }
}

/** Ends the session on the server. */
export async function signOut(): Promise<boolean> {
  try {
    await request('/auth/logout', { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}
