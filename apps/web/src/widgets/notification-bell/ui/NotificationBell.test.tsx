import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import type { AppNotification } from '@t2-sales-hub/core';
import { NotificationBell } from './NotificationBell';

const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    category: 'plan',
    severity: 'info',
    title: 'План обновлён',
    body: 'План по оборудованию изменился.',
    createdAt: new Date().toISOString(),
    isRead: false,
    isActionable: true,
    channel: 'in-app',
  },
  {
    id: 'notif-2',
    category: 'test',
    severity: 'warning',
    title: 'Назначен тест',
    body: 'Тест необходимо пройти до 28 ноября.',
    createdAt: new Date().toISOString(),
    isRead: true,
    isActionable: false,
    channel: 'in-app',
  },
];

describe('NotificationBell', () => {
  it('shows the unread count', () => {
    render(
      <NotificationBell
        notifications={NOTIFICATIONS}
        unreadCount={1}
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /Уведомления, непрочитанных: 1/ })
    ).toBeInTheDocument();
  });

  it('opens the list on click', () => {
    render(
      <NotificationBell
        notifications={NOTIFICATIONS}
        unreadCount={1}
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />
    );

    const toggle = screen.getByRole('button', { name: /Уведомления/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('План обновлён')).toBeInTheDocument();
    expect(screen.getByText('Назначен тест')).toBeInTheDocument();
  });

  it('marks a notification as read when it is opened', () => {
    const onMarkRead = vi.fn();
    render(
      <NotificationBell
        notifications={NOTIFICATIONS}
        unreadCount={1}
        onMarkRead={onMarkRead}
        onMarkAllRead={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Уведомления/ }));
    fireEvent.click(screen.getByText('План обновлён'));

    expect(onMarkRead).toHaveBeenCalledWith('notif-1');
  });

  it('shows an empty state when there are no notifications', () => {
    render(
      <NotificationBell
        notifications={[]}
        unreadCount={0}
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Уведомления' }));
    expect(screen.getByText('Пока нет уведомлений')).toBeInTheDocument();
  });
});
