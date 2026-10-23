import { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export type BadgeVariant =
  | 'default'
  | 'brand'
  | 'lime'
  | 'electric'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline'
  | 'glass';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { children, variant = 'default', size = 'md', dot = false, className, style, ...props },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center rounded-full font-medium whitespace-nowrap';

    const variantStyles = {
      default: 'bg-background-tertiary text-text-secondary border border-border-secondary',
      // Magenta — the brand accent.
      brand: 'bg-brand-500/10 text-brand-600 border border-brand-500/25',
      // Lime — the T2 attention accent.
      lime: 'bg-lime-500/20 text-ink-900 border border-lime-500/40',
      electric: 'bg-electric-500/10 text-electric-600 border border-electric-500/25',
      success: 'bg-success-bg text-success-600 border border-success-border',
      warning: 'bg-warning-bg text-warning-600 border border-warning-border',
      danger: 'bg-danger-bg text-danger-600 border border-danger-border',
      info: 'bg-info-bg text-info-600 border border-info-border',
      outline: 'bg-transparent text-text-secondary border border-border-primary',
      glass: 'glass-surface text-text-primary',
    };

    const dotColor = {
      default: 'bg-text-tertiary',
      brand: 'bg-brand-500',
      lime: 'bg-lime-500',
      electric: 'bg-electric-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      danger: 'bg-danger-500',
      info: 'bg-info-500',
      outline: 'bg-text-tertiary',
      glass: 'bg-brand-500',
    };

    const sizeStyles = {
      sm: 'gap-1 px-2 py-0.5 text-[0.6875rem]',
      md: 'gap-1.5 px-2.5 py-1 text-xs',
      lg: 'gap-1.5 px-3 py-1 text-sm',
    };

    return (
      <span
        ref={ref}
        className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        style={style}
        {...props}
      >
        {dot && (
          <span
            className={clsx('h-1.5 w-1.5 rounded-full', dotColor[variant])}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
