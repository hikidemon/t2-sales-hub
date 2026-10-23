import { useEffect, type ReactNode } from 'react';

import { AuthProvider } from '@/features/auth';

/**
 * The active theme.
 *
 * Light is the T2 default surface — the official site and the brand
 * guide are built on white with magenta accents. The dark theme stays
 * available under `[data-theme='dark']` and can be switched here or by
 * a theme toggle in a later stage.
 */
const DEFAULT_THEME = 'light';

export interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Global providers composition point.
 * Add future providers here (query client, toasts, etc.).
 */
export function AppProviders({ children }: AppProvidersProps) {
  useEffect(() => {
    document.documentElement.dataset.theme = DEFAULT_THEME;
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}
