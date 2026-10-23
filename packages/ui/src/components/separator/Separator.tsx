import { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface SeparatorProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'dashed' | 'dotted';
  length?: 'full' | 'auto';
  decorative?: boolean;
}

export const Separator = forwardRef<HTMLHRElement, SeparatorProps>(
  (
    {
      orientation = 'horizontal',
      variant = 'default',
      length = 'full',
      decorative = true,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const orientationStyles = {
      horizontal: 'w-full h-px',
      vertical: 'h-full w-px',
    };

    const variantStyles = {
      default: 'bg-border-primary',
      dashed: 'bg-border-primary border-t-[1px] border-dashed',
      dotted: 'bg-border-primary border-t-[1px] border-dotted',
    };

    const lengthStyles = {
      full: orientation === 'horizontal' ? 'w-full' : 'h-full',
      auto: '',
    };

    const decorativeStyles = decorative ? 'opacity-50' : '';

    const Component = decorative ? 'div' : 'hr';

    return (
      <Component
        ref={ref}
        className={clsx(
          'shrink-0',
          orientationStyles[orientation],
          variantStyles[variant],
          lengthStyles[length],
          decorativeStyles,
          className
        )}
        style={style}
        role={decorative ? 'separator' : undefined}
        aria-orientation={orientation}
        {...props}
      />
    );
  }
);

Separator.displayName = 'Separator';
