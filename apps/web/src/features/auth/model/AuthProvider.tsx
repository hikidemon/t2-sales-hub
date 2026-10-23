/**
 * The session state, shared by the gate and the pages.
 *
 * The session is resolved once on the server; the client asks for it
 * once and every part of the interface reads the same answer. Without
 * this the gate and the header would each make their own request.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { AuthUser } from '@t2-sales-hub/core';

import { loadAuthConfig, loadCurrentUser, type AuthConfig } from '@/shared/api/auth';

export interface AuthState {
  /** What the server knows about the authentication setup. */
  config: AuthConfig | null;
  /** The signed-in user, when there is one. */
  user: AuthUser | null;
  /** True while the session is being resolved. */
  isChecking: boolean;
  /** Re-reads the session from the server. */
  refresh: () => void;
}

const AuthContext = createContext<AuthState>({
  config: null,
  user: null,
  isChecking: true,
  refresh: () => undefined,
});

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const [loadedConfig, loadedUser] = await Promise.all([loadAuthConfig(), loadCurrentUser()]);

      if (!isActive) return;

      setConfig(loadedConfig);
      setUser(loadedUser);
      setIsChecking(false);
    })();

    return () => {
      isActive = false;
    };
  }, [attempt]);

  const refresh = useCallback(() => {
    setIsChecking(true);
    setAttempt((value) => value + 1);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ config, user, isChecking, refresh }),
    [config, user, isChecking, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Reads the session state. */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
