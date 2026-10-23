/**
 * Notification service.
 *
 * Holds the notification list, produces new notifications when the data
 * source reports a change, and tracks the read state.
 *
 * The service is deliberately simple: notifications are produced by the
 * system (a plan changed, a test was assigned) rather than pushed from
 * the outside, so the list is rebuilt from the event log on demand.
 */

import type { AppNotification, NotificationFilter, NotificationSummary } from '@t2-sales-hub/core';

export interface NotificationService {
  list(filter?: NotificationFilter): AppNotification[];
  summary(): NotificationSummary;
  markRead(id: string): boolean;
  markAllRead(): number;
  /** Adds a notification produced by the system. */
  push(
    notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead' | 'channel'> & {
      channel?: AppNotification['channel'];
    }
  ): AppNotification;
}

export class InMemoryNotificationService implements NotificationService {
  private notifications: AppNotification[];
  private counter = 0;

  constructor(seed: AppNotification[] = []) {
    this.notifications = [...seed];
  }

  list(filter: NotificationFilter = {}): AppNotification[] {
    let result = [...this.notifications];

    if (filter.category) {
      result = result.filter((item) => item.category === filter.category);
    }
    if (filter.severity) {
      result = result.filter((item) => item.severity === filter.severity);
    }
    if (filter.isRead !== undefined) {
      result = result.filter((item) => item.isRead === filter.isRead);
    }

    result.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    if (filter.limit && filter.limit > 0) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  summary(): NotificationSummary {
    const total = this.notifications.length;
    const unread = this.notifications.filter((item) => !item.isRead).length;
    const actionable = this.notifications.filter(
      (item) => item.isActionable && !item.isRead
    ).length;
    return { total, unread, actionable };
  }

  markRead(id: string): boolean {
    const target = this.notifications.find((item) => item.id === id);
    if (!target) return false;
    target.isRead = true;
    return true;
  }

  markAllRead(): number {
    const unread = this.notifications.filter((item) => !item.isRead);
    for (const item of unread) {
      item.isRead = true;
    }
    return unread.length;
  }

  push(
    notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead' | 'channel'> & {
      channel?: AppNotification['channel'];
    }
  ): AppNotification {
    this.counter += 1;
    const created: AppNotification = {
      ...notification,
      id: `notif-generated-${this.counter}`,
      createdAt: new Date().toISOString(),
      isRead: false,
      channel: notification.channel ?? 'in-app',
    };
    this.notifications.unshift(created);
    return created;
  }
}
