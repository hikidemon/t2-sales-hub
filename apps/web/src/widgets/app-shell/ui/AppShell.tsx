import { type ReactNode } from 'react';

import { Badge } from '@t2-sales-hub/ui';
import { useAuth } from '@/features/auth';
import { appConfig } from '@/shared/config';
import { NavList } from './NavList';

export interface AppShellProps {
  children: ReactNode;
}

/**
 * Adaptive app shell:
 *  - desktop (>=1024px): fixed sidebar + top bar + scrollable content;
 *  - mobile: compact top bar + bottom navigation with safe-area support.
 *
 * Layout is built with flex/grid only (no absolute positioning scaffolds).
 */
export function AppShell({ children }: AppShellProps) {
  const { user } = useAuth();
  const roles = user?.roles ?? [];

  return (
    <div className="flex min-h-dvh bg-background-primary text-text-primary">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border-secondary bg-background-secondary lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border-secondary px-5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white"
            aria-hidden="true"
          >
            T2
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">{appConfig.appName}</span>
            <span className="text-[0.625rem] leading-tight text-text-tertiary">
              портал продавца
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavList orientation="vertical" roles={roles} />
        </div>

        <div className="border-t border-border-secondary px-5 py-4">
          {user ? (
            <Badge variant="lime" size="sm" dot>
              {roles.includes('admin')
                ? 'администратор'
                : roles.includes('curator')
                  ? 'куратор'
                  : 'продавец'}
            </Badge>
          ) : (
            appConfig.isDemo && (
              <Badge variant="lime" size="sm" dot>
                Демо-режим
              </Badge>
            )
          )}
          <p className="mt-2 text-[0.6875rem] leading-relaxed text-text-muted">
            Демонстрационный проект. Не является официальным продуктом T2.
          </p>
        </div>
      </aside>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile / tablet top bar */}
        <header className="glass-surface sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-secondary px-4 pt-safe md:px-6 lg:hidden">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-xs font-bold text-white"
              aria-hidden="true"
            >
              T2
            </span>
            <span className="text-sm font-semibold">{appConfig.appName}</span>
          </div>
          {appConfig.isDemo && (
            <Badge variant="lime" size="sm">
              демо
            </Badge>
          )}
        </header>

        {/* Main scrollable content */}
        <main className="flex-1 px-4 pb-28 pt-6 md:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        {/* Mobile bottom navigation */}
        <nav
          aria-label="Нижняя навигация"
          className="glass-surface fixed inset-x-0 bottom-0 z-40 border-t border-border-secondary pb-safe lg:hidden"
        >
          <div className="mx-auto max-w-lg px-2 py-1.5">
            <NavList orientation="horizontal" />
          </div>
        </nav>
      </div>
    </div>
  );
}
