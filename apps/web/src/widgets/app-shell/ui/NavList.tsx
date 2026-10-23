import { NavLink } from 'react-router-dom';

import type { UserRole } from '@t2-sales-hub/core';
import { Badge, Icon } from '@t2-sales-hub/ui';
import { cn } from '@/shared/lib';
import { visibleNavItems, type NavItem } from '../config/navigation';

interface NavListProps {
  orientation: 'vertical' | 'horizontal';
  onNavigate?: () => void;
  /** The roles of the signed-in user. */
  roles?: UserRole[];
}

function NavItemControl({
  item,
  orientation,
  onNavigate,
}: {
  item: NavItem;
  orientation: 'vertical' | 'horizontal';
  onNavigate?: () => void;
}) {
  if (item.disabled) {
    return (
      <span
        className={cn(
          'flex items-center gap-3 rounded-xl text-sm font-medium text-text-muted',
          orientation === 'vertical' ? 'px-3 py-2.5' : 'flex-col gap-1 px-2 py-1.5 text-[0.625rem]'
        )}
        aria-disabled="true"
      >
        <Icon name={item.icon} size={orientation === 'vertical' ? 'md' : 'sm'} />
        {orientation === 'vertical' ? (
          <span className="flex flex-1 items-center justify-between">
            {item.label}
            <Badge size="sm" variant="outline">
              скоро
            </Badge>
          </span>
        ) : (
          item.label
        )}
      </span>
    );
  }

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      end={item.path === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl text-sm font-medium transition-colors',
          orientation === 'vertical' ? 'px-3 py-2.5' : 'flex-col gap-1 px-2 py-1.5 text-[0.625rem]',
          isActive
            ? 'bg-brand-500/10 text-brand-600'
            : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={
              isActive
                ? 'flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white'
                : 'flex h-8 w-8 items-center justify-center rounded-lg bg-background-tertiary text-text-tertiary'
            }
            aria-hidden="true"
          >
            <Icon name={item.icon} size="sm" />
          </span>
          {item.label}
        </>
      )}
    </NavLink>
  );
}

export function NavList({ orientation, onNavigate, roles = [] }: NavListProps) {
  const items = visibleNavItems(roles);

  return (
    <nav
      aria-label={
        orientation === 'vertical' ? 'Основная навигация' : 'Основная навигация (мобильная)'
      }
      className={cn(
        orientation === 'vertical' ? 'flex flex-col gap-1' : 'flex items-stretch justify-around'
      )}
    >
      {items.map((item) => (
        <NavItemControl
          key={item.key}
          item={item}
          orientation={orientation}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
