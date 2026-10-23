import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

import { Icon, type IconName } from '../icon/Icon.js';

/**
 * Toast — a transient notification.
 *
 * The colour of the leading icon carries the severity, so the toast is
 * readable without relying on colour alone — the title and description
 * always state what happened.
 */
export type ToastVariant = 'info' | 'success' | 'warning' | 'danger' | 'brand';

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: ToastVariant;
  title: string;
  description?: string;
  /** Icon shown in front of the title. */
  icon?: IconName;
  /** Action button rendered under the description. */
  action?: { label: string; onClick: () => void };
  /** Dismiss handler. When absent the toast is not dismissible. */
  onDismiss?: () => void;
  /** Live region politeness. */
  role?: 'status' | 'alert';
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { container: string; icon: string; defaultIcon: IconName }
> = {
  info: {
    container: 'border-info-border bg-info-bg',
    icon: 'text-info-600',
    defaultIcon: 'info',
  },
  success: {
    container: 'border-success-border bg-success-bg',
    icon: 'text-success-600',
    defaultIcon: 'check',
  },
  warning: {
    container: 'border-warning-border bg-warning-bg',
    icon: 'text-warning-600',
    defaultIcon: 'alert-triangle',
  },
  danger: {
    container: 'border-danger-border bg-danger-bg',
    icon: 'text-danger-600',
    defaultIcon: 'alert-triangle',
  },
  brand: {
    container: 'border-brand-500/25 bg-brand-500/10',
    icon: 'text-brand-600',
    defaultIcon: 'sparkles',
  },
};

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      variant = 'info',
      title,
      description,
      icon,
      action,
      onDismiss,
      role = 'status',
      className,
      style,
      ...props
    },
    ref
  ) => {
    const styles = VARIANT_STYLES[variant];

    return (
      <div
        ref={ref}
        role={role}
        className={clsx(
          'flex w-full items-start gap-3 rounded-xl border p-4 shadow-md animate-slide-in-right',
          styles.container,
          className
        )}
        style={style}
        {...props}
      >
        <span className={clsx('mt-0.5 shrink-0', styles.icon)} aria-hidden="true">
          <Icon name={icon ?? styles.defaultIcon} size="md" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          {description && (
            <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">{description}</p>
          )}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-2 text-sm font-semibold text-text-primary underline underline-offset-2 transition-colors hover:text-brand-600"
            >
              {action.label}
            </button>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Закрыть уведомление"
            className="shrink-0 rounded-lg p-1 text-text-tertiary transition-colors hover:bg-background-tertiary hover:text-text-primary"
          >
            <Icon name="close" size="sm" />
          </button>
        )}
      </div>
    );
  }
);

Toast.displayName = 'Toast';

/** Container that positions a stack of toasts. */
export interface ToastViewportProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const ToastViewport = forwardRef<HTMLDivElement, ToastViewportProps>(
  ({ children, className, style, ...props }, ref) => (
    <div
      ref={ref}
      aria-live="polite"
      aria-atomic="false"
      className={clsx(
        'pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-96',
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
);

ToastViewport.displayName = 'ToastViewport';
