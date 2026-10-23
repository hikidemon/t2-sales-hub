import { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'brand' | 'lime' | 'electric';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  striped?: boolean;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      value,
      max = 100,
      size = 'md',
      variant = 'default',
      showLabel = false,
      label,
      animated = false,
      striped = false,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeStyles = {
      sm: 'h-1.5',
      md: 'h-2.5',
      lg: 'h-4',
    };

    const variantStyles = {
      default: 'bg-brand-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      danger: 'bg-danger-500',
      brand: 'bg-brand-500',
      lime: 'bg-lime-500',
      electric: 'bg-electric-500',
    };

    // The track must stay visible on the light T2 surface.
    const trackStyles = 'bg-background-tertiary';

    const animationStyles = animated ? 'animate-pulse' : '';
    const stripedStyles = striped
      ? 'bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-progress-stripe'
      : '';

    return (
      <div ref={ref} className={clsx('w-full', className)} style={style} {...props}>
        {(showLabel || label) && (
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-text-secondary">
              {label || `${Math.round(percentage)}%`}
            </span>
            {showLabel && (
              <span className="text-xs text-text-tertiary tabular-nums">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}
        <div
          className={clsx('relative overflow-hidden rounded-full', trackStyles, sizeStyles[size])}
          role="progressbar"
          aria-valuenow={Math.round(percentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || 'Progress'}
        >
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-300 ease-out',
              variantStyles[variant],
              animationStyles,
              stripedStyles
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export interface CircularProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  thickness?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'brand';
  showLabel?: boolean;
  label?: string;
}

export const CircularProgress = forwardRef<HTMLDivElement, CircularProgressProps>(
  (
    {
      value,
      max = 100,
      size = 'md',
      thickness = 4,
      variant = 'default',
      showLabel = true,
      label,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    // Radius must match the `r` attribute of circles inside the 0 0 100 100 viewBox.
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const sizeClasses = {
      sm: 'w-12 h-12',
      md: 'w-16 h-16',
      lg: 'w-20 h-20',
      xl: 'w-24 h-24',
    };

    const variantStyles = {
      default: 'text-brand-500',
      success: 'text-success-500',
      warning: 'text-warning-500',
      danger: 'text-danger-500',
      brand: 'text-brand-500',
    };

    const trackColor = {
      default: 'text-surface-700',
      success: 'text-success-500/30',
      warning: 'text-warning-500/30',
      danger: 'text-danger-500/30',
      brand: 'text-brand-500/30',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'relative inline-flex items-center justify-center',
          sizeClasses[size],
          className
        )}
        style={style}
        {...props}
      >
        <svg
          className="transform -rotate-90 w-full h-full"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <circle
            className={clsx(trackColor[variant])}
            strokeWidth={thickness}
            strokeLinecap="round"
            fill="none"
            cx="50%"
            cy="50%"
            r="45"
          />
          <circle
            className={clsx(variantStyles[variant], 'transition-all duration-500 ease-out')}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            fill="none"
            cx="50%"
            cy="50%"
            r="45"
          />
        </svg>
        {(showLabel || label) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={clsx(
                'font-medium tabular-nums',
                size === 'sm' && 'text-xs',
                size === 'md' && 'text-sm',
                size === 'lg' && 'text-base',
                size === 'xl' && 'text-lg'
              )}
            >
              {label ?? `${Math.round(percentage)}%`}
            </span>
          </div>
        )}
      </div>
    );
  }
);

CircularProgress.displayName = 'CircularProgress';
