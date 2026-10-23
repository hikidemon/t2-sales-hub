/**
 * The administrator's page.
 *
 * It is only reachable by a user who holds the administrator role —
 * the route guard checks the role, and the server checks it again on
 * every protected endpoint.
 *
 * The page brings together the things an administrator needs while
 * testing the application:
 *  - the state of the data pipeline and a manual refresh;
 *  - the state of the external systems;
 *  - the tests, with their statistics.
 */

import { useCallback, useEffect, useState } from 'react';

import type { IntegrationDescriptor, SyncStatus, TestWithState } from '@t2-sales-hub/core';
import { Badge, Card, Icon } from '@t2-sales-hub/ui';
import { useAuth } from '@/features/auth';
import { EmployeeDirectoryPanel } from '@/widgets/employee-directory';
import { loadIntegrations, loadMyTests, loadSyncStatus, refreshSync } from '@/shared/api/dashboard';

export function AdminPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationDescriptor[]>([]);
  const [tests, setTests] = useState<TestWithState[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [loadedStatus, loadedIntegrations, loadedTests] = await Promise.all([
      loadSyncStatus(),
      loadIntegrations(),
      loadMyTests(),
    ]);
    setStatus(loadedStatus);
    setIntegrations(loadedIntegrations?.items ?? []);
    setTests(loadedTests?.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setMessage(null);
    try {
      const result = await refreshSync();
      setMessage(
        result.ok
          ? `Данные обновлены за ${result.durationMs} мс`
          : `Не удалось обновить: ${result.error ?? 'неизвестная ошибка'}`
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Не удалось обновить: ${error.message}`
          : 'Не удалось обновить данные'
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  const isAdmin = user?.roles.includes('admin') ?? false;

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card variant="outlined" className="max-w-md p-6 text-center">
          <h1 className="font-display text-xl">Доступ закрыт</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-tertiary">
            Раздел доступен только администраторам. Войдите под учётной записью с административной
            ролью.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl tracking-tight md:text-3xl">Управление</h1>
        <p className="text-sm text-text-tertiary">
          Данные, интеграции и тесты — всё, что нужно для проверки проекта
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card variant="neo" className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Пайплайн данных
              </p>
              <p className="mt-2 font-display text-lg">{status?.source ?? '—'}</p>
            </div>
            <Badge variant={status?.state === 'ok' ? 'lime' : 'warning'} size="sm" dot>
              {status?.state ?? 'нет данных'}
            </Badge>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-text-muted">Последний успех</dt>
              <dd className="mt-0.5 font-medium">
                {status?.lastSuccessAt
                  ? new Date(status.lastSuccessAt).toLocaleString('ru-RU')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Интервал</dt>
              <dd className="mt-0.5 font-medium">
                {status ? `${Math.round(status.intervalMs / 1000)} с` : '—'}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="refresh" size="sm" />
            {isRefreshing ? 'Обновляем…' : 'Обновить сейчас'}
          </button>

          {message && (
            <p className="mt-3 text-xs leading-relaxed text-text-secondary" role="status">
              {message}
            </p>
          )}
        </Card>

        <Card variant="glass" className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Внешние системы
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {integrations.length === 0 && <li className="text-xs text-text-muted">Список пуст</li>}
            {integrations.map((integration) => (
              <li
                key={integration.kind}
                className="flex items-center justify-between gap-3 rounded-xl bg-background-tertiary px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{integration.displayName}</p>
                  <p className="truncate text-[0.6875rem] text-text-muted">{integration.purpose}</p>
                </div>
                <Badge
                  variant={integration.state === 'available' ? 'lime' : 'outline'}
                  size="sm"
                  dot
                >
                  {integration.state === 'available'
                    ? 'подключено'
                    : integration.requiresCredentials
                      ? 'ожидает доступа'
                      : integration.state}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card variant="outlined" className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Тесты</p>
          <Badge variant="outline" size="sm">
            {tests.length}
          </Badge>
        </div>

        <ul className="mt-3 flex flex-col gap-2">
          {tests.length === 0 && (
            <li className="text-xs text-text-muted">Тестов пока нет — их создаёт куратор.</li>
          )}
          {tests.map((test) => (
            <li
              key={test.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-background-tertiary px-3 py-2.5"
            >
              <span className="text-sm font-medium">{test.title}</span>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant={
                    test.status === 'published'
                      ? 'lime'
                      : test.status === 'draft'
                        ? 'warning'
                        : 'outline'
                  }
                  size="sm"
                >
                  {test.status}
                </Badge>
                {test.scorePercent !== null && (
                  <Badge variant="outline" size="sm">
                    {test.scorePercent}%
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <EmployeeDirectoryPanel />
    </div>
  );
}
