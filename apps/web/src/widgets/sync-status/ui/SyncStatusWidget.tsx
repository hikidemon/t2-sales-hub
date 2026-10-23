/**
 * Sync status widget — shows the data source, the time of the last
 * successful refresh and the current state of the pipeline.
 */

import type { SyncStatus } from '@t2-sales-hub/core';
import { Badge, Card, CardContent, Icon, type IconName } from '@t2-sales-hub/ui';

export interface SyncStatusWidgetProps {
  status: SyncStatus | null;
  capturedAt: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const STATE_LABEL: Record<SyncStatus['state'], string> = {
  idle: 'Ожидание',
  syncing: 'Обновление',
  ok: 'Актуально',
  error: 'Ошибка синхронизации',
  stale: 'Данные устарели',
};

const STATE_VARIANT: Record<SyncStatus['state'], 'success' | 'warning' | 'danger' | 'default'> = {
  idle: 'default',
  syncing: 'warning',
  ok: 'success',
  error: 'danger',
  stale: 'warning',
};

const STATE_ICON: Record<SyncStatus['state'], IconName> = {
  idle: 'clock',
  syncing: 'refresh',
  ok: 'check',
  error: 'alert-triangle',
  stale: 'alert-triangle',
};

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SyncStatusWidget({
  status,
  capturedAt,
  onRefresh,
  isRefreshing = false,
}: SyncStatusWidgetProps) {
  if (!status) {
    return null;
  }

  const intervalMinutes = Math.round(status.intervalMs / 60_000);
  const isLive = status.source === 'google-sheets';

  return (
    <Card variant="glass">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span
              className={
                isLive
                  ? 'flex h-9 w-9 items-center justify-center rounded-xl bg-lime-500/20 text-ink-900'
                  : 'flex h-9 w-9 items-center justify-center rounded-xl bg-background-tertiary text-text-tertiary'
              }
              aria-hidden="true"
            >
              <Icon name={isLive ? 'file-text' : 'plug'} size="sm" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Источник данных</span>
              <span className="text-xs text-text-tertiary">
                {isLive ? 'Google Sheets' : 'Локальные демо-данные'} · обновление каждые{' '}
                {intervalMinutes} мин
              </span>
            </div>
          </div>

          <Badge variant={STATE_VARIANT[status.state]} size="sm" dot>
            <Icon name={STATE_ICON[status.state]} size="sm" />
            {STATE_LABEL[status.state]}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-text-tertiary">
            Последнее обновление:{' '}
            <span className="font-medium text-text-primary tabular-nums">
              {formatTime(capturedAt ?? status.lastSuccessAt)}
            </span>
          </span>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-lg border border-border-secondary px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background-tertiary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="refresh" size="sm" />
              {isRefreshing ? 'Обновление…' : 'Обновить данные'}
            </button>
          )}
        </div>

        {status.state === 'error' && status.lastError && (
          <p className="rounded-xl bg-danger-bg px-3 py-2 text-xs leading-relaxed text-danger-600">
            {status.lastError}
            {status.servingStaleData && ' Показаны данные последней успешной синхронизации.'}
          </p>
        )}

        {status.state === 'stale' && (
          <p className="rounded-xl bg-warning-bg px-3 py-2 text-xs leading-relaxed text-warning-600">
            Данные не обновлялись дольше {intervalMinutes} мин. Актуальность не гарантирована.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
