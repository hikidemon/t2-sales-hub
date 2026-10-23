/**
 * Notification domain model.
 *
 * Notifications tell the seller that something in their working context
 * changed: a plan was updated, a new test was assigned, a bonus was
 * recalculated, an external source went stale.
 *
 * Framework-independent — no React, no transport.
 */

/** What produced the notification. */
export type NotificationCategory =
  'plan' | 'bonus' | 'test' | 'integration' | 'sync' | 'announcement';

/** How urgent the notification is. */
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger';

export type NotificationChannel = 'in-app' | 'email' | 'telegram';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  /** Short headline — what happened. */
  title: string;
  /** Optional detail — what exactly changed. */
  body?: string;
  /** ISO timestamp of the event. */
  createdAt: string;
  /** Whether the user has seen it. */
  isRead: boolean;
  /** Whether it still needs attention (an outdated warning, say). */
  isActionable: boolean;
  /** Deep link into the relevant page, e.g. `/tests/quiz-1`. */
  link?: string;
  /** Channel it was delivered through. */
  channel: NotificationChannel;
  /** Payload of the change, when the source provides one. */
  meta?: Record<string, string | number | boolean>;
}

/** A notification that has not been read yet. */
export interface NotificationSummary {
  total: number;
  unread: number;
  actionable: number;
}

/** Filter for the notification list. */
export interface NotificationFilter {
  category?: NotificationCategory;
  severity?: NotificationSeverity;
  isRead?: boolean;
  limit?: number;
}
