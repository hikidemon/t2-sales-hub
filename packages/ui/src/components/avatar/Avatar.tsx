import { forwardRef, type HTMLAttributes, type ImgHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  alt?: string;
  src?: string | null;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'square';
  status?: 'online' | 'offline' | 'busy' | 'away';
  statusPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[0.5rem]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-24 h-24 text-xl',
};

const shapeClasses = {
  circle: 'rounded-full',
  square: 'rounded-xl',
};

const statusSizeClasses = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
  '2xl': 'w-4 h-4',
};

const statusColorClasses = {
  online: 'bg-success-500',
  offline: 'bg-surface-500',
  busy: 'bg-danger-500',
  away: 'bg-warning-500',
};

const statusPositionClasses = {
  'bottom-right': 'bottom-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'top-right': 'top-0 right-0',
  'top-left': 'top-0 left-0',
};

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-brand-500',
    'bg-brand-600',
    'bg-brand-700',
    'bg-purple-500',
    'bg-purple-600',
    'bg-pink-500',
    'bg-pink-600',
    'bg-fuchsia-500',
    'bg-fuchsia-600',
    'bg-rose-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index] ?? 'bg-brand-500';
}

export const Avatar = forwardRef<HTMLImageElement, AvatarProps>(
  (
    {
      src,
      alt = '',
      fallback,
      size = 'md',
      shape = 'circle',
      status,
      statusPosition = 'bottom-right',
      className,
      style,
      ...props
    },
    ref
  ) => {
    const initials = fallback ? getInitials(fallback) : '?';
    const bgColor = fallback ? getColorFromName(fallback) : 'bg-surface-600';
    const hasImage = src && src.length > 0;

    return (
      <div className={clsx('relative inline-flex shrink-0', className)} style={style}>
        {hasImage ? (
          <img
            ref={ref}
            src={src}
            alt={alt || fallback || 'Avatar'}
            className={clsx(sizeClasses[size], shapeClasses[shape], 'object-cover')}
            {...props}
          />
        ) : (
          <div
            ref={ref}
            className={clsx(
              sizeClasses[size],
              shapeClasses[shape],
              bgColor,
              'flex items-center justify-center font-medium text-white select-none'
            )}
            aria-label={fallback || 'Avatar'}
            {...props}
          >
            {initials}
          </div>
        )}
        {status && (
          <span
            className={clsx(
              'absolute rounded-full border-2 border-background-primary',
              statusSizeClasses[size],
              statusColorClasses[status],
              statusPositionClasses[statusPosition]
            )}
            aria-label={status}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ children, max = 5, size = 'md', className, style, ...props }, ref) => {
    const childArray = Array.isArray(children) ? children : [children];
    const validChildren = childArray.filter(Boolean).slice(0, max);
    const overflowCount = childArray.length - max;

    const overlapStyles = {
      xs: '-ml-1.5',
      sm: '-ml-2',
      md: '-ml-2.5',
      lg: '-ml-3',
      xl: '-ml-4',
      '2xl': '-ml-6',
    };

    return (
      <div ref={ref} className={clsx('flex items-center', className)} style={style} {...props}>
        <div className="flex" aria-label={`${validChildren.length} avatars`}>
          {validChildren.map((child, index) =>
            index === 0 ? (
              child
            ) : (
              <span key={index} className={clsx(overlapStyles[size])}>
                {child}
              </span>
            )
          )}
        </div>
        {overflowCount > 0 && (
          <span
            className={clsx(
              sizeClasses[size],
              'rounded-full bg-surface-700 border-2 border-background-primary flex items-center justify-center font-medium text-text-secondary',
              overlapStyles[size]
            )}
            aria-label={`${overflowCount} more`}
          >
            +{overflowCount}
          </span>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';
