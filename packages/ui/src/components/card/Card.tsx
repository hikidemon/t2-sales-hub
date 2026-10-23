import { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

/**
 * Card — the base surface of the T2 bento system.
 *
 * Variants map to the brand rules:
 *   default  — a white surface on the light T2 background
 *   glass    — translucent layer over a blurred backdrop
 *   neo      — a bento block with a hard offset shadow, no blur
 *   elevated — a lifted surface with the measured T2 shadow
 *   outlined — a surface defined by its border only
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'neo' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      hoverable = false,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'bg-background-card border border-border-secondary',
      glass: 'glass-surface',
      neo: 'neo-block bg-background-card',
      elevated: 'bg-background-card border border-border-secondary shadow-lg',
      outlined: 'bg-transparent border border-border-primary',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6',
    };

    const hoverStyles = hoverable
      ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-border-primary'
      : '';

    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-xl',
          variantStyles[variant],
          paddingStyles[padding],
          hoverStyles,
          className
        )}
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, style, ...props }, ref) => (
    <div ref={ref} className={clsx('mb-4', className)} style={style} {...props}>
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, as: Component = 'h3', className, style, ...props }, ref) => (
    <Component
      ref={ref}
      className={clsx('font-display text-lg text-text-primary', className)}
      style={style}
      {...props}
    >
      {children}
    </Component>
  )
);

CardTitle.displayName = 'CardTitle';

export type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className, style, ...props }, ref) => (
    <p
      ref={ref}
      className={clsx('mt-1 text-sm text-text-tertiary', className)}
      style={style}
      {...props}
    >
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';

export type CardContentProps = HTMLAttributes<HTMLDivElement>;

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, style, ...props }, ref) => (
    <div ref={ref} className={clsx(className)} style={style} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'mt-4 flex items-center gap-3 border-t border-border-secondary pt-4',
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';
