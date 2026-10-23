import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

/**
 * Button.
 *
 * The brand guide defines the lime button as the attention device
 * («салатовый цвет… используется как фоновый цвет кнопки») on a black
 * surface with black text, and the magenta button as the primary action.
 * Both are implemented here; `secondary` uses the electric blue.
 */
export type ButtonVariant =
  'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'glass' | 'danger' | 'neo';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  /** Icon rendered before the label. */
  leftIcon?: ReactNode;
  /** Icon rendered after the label. */
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50';

    const variantStyles = {
      // Lime on ink — the T2 attention button.
      primary:
        'bg-lime-500 text-ink-950 hover:bg-lime-400 active:bg-lime-600 shadow-sm hover:shadow-md',
      // Electric blue, white text.
      secondary:
        'bg-electric-500 text-white hover:bg-electric-400 active:bg-electric-600 shadow-sm hover:shadow-md',
      // Magenta — the brand accent, used sparingly.
      accent:
        'bg-brand-500 text-white hover:bg-brand-400 active:bg-brand-600 shadow-sm hover:shadow-md',
      outline:
        'border border-border-primary bg-transparent text-text-primary hover:bg-background-tertiary',
      ghost:
        'bg-transparent text-text-secondary hover:bg-background-tertiary hover:text-text-primary',
      glass: 'glass-surface text-text-primary hover:bg-background-card',
      danger: 'bg-danger-500 text-white hover:bg-danger-400 active:bg-danger-600',
      // Neo: hard border and offset shadow, no blur.
      neo: 'neo-block border-2 border-ink-900 bg-background-card text-ink-900 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none',
    };

    const sizeStyles = {
      sm: 'h-9 px-3 text-xs',
      md: 'h-11 px-4 text-sm',
      lg: 'h-13 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
