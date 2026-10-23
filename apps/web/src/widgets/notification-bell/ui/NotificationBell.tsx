/**
 * Notification bell — shows the unread count and opens the notification
 * list. The list is a dropdown panel anchored to the bell.
 */

import { useEffect, useRef, useState } from 'react';

import type { AppNotification } from '@t2-sales-hub/core';
import { Badge, Button, Icon, type IconName } from '@t2-sales-hub/ui';

export interface NotificationBellProps {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpen?: (notification: AppNotification) => void;
}

const CATEGORY_ICON: Record<AppNotification['category'], IconName> = {
  plan: 'target',
  bonus: 'award',
  test: 'graduation',
  integration: 'plug',
  sync: 'refresh',
  announcement: 'bell',
};

const SEVERITY_CLASS: Record<AppNotification['severity'], string> = {
  info: 'bg-info-bg text-info-600',
  success: 'bg-success-bg text-success-600',
  warning: 'bg-warning-bg text-warning-600',
  danger: 'bg-danger-bg text-danger-600',
};

function formatAge(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  return `${days} дн назад`;
}

export function NotificationBell({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onOpen,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={unreadCount > 0 ? `Уведомления, непрочитанных: ${unreadCount}` : 'Уведомления'}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border-secondary bg-background-card text-text-secondary transition-colors hover:bg-background-tertiary hover:text-text-primary"
      >
        <Icon name="bell" size="sm" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[0.625rem] font-bold text-white"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="glass-surface absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl shadow-lg animate-scale-in">
          <div className="flex items-center justify-between border-b border-border-secondary px-4 py-3">
            <h2 className="text-sm font-semibold">Уведомления</h2>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
                Прочитать все
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <Icon name="inbox" size="lg" className="text-text-tertiary" />
              <p className="text-sm font-medium">Пока нет уведомлений</p>
              <p className="text-xs text-text-tertiary">
                Изменения в планах, бонусах и тестах появятся здесь.
              </p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-border-secondary overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onMarkRead(notification.id);
                      onOpen?.(notification);
                    }}
                    className={
                      notification.isRead
                        ? 'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-background-tertiary'
                        : 'flex w-full items-start gap-3 bg-brand-500/5 px-4 py-3 text-left transition-colors hover:bg-background-tertiary'
                    }
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${SEVERITY_CLASS[notification.severity]}`}
                      aria-hidden="true"
                    >
                      <Icon name={CATEGORY_ICON[notification.category]} size="sm" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {notification.title}
                        </span>
                        {!notification.isRead && (
                          <Badge variant="brand" size="sm">
                            новое
                          </Badge>
                        )}
                      </span>
                      {notification.body && (
                        <span className="mt-0.5 block text-xs leading-relaxed text-text-tertiary">
                          {notification.body}
                        </span>
                      )}
                      <span className="mt-1 block text-[0.6875rem] text-text-muted">
                        {formatAge(notification.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
