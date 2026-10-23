import type { UserRole } from '@t2-sales-hub/core';
import type { IconName } from '@t2-sales-hub/ui';

/**
 * Single source of navigation truth shared by the desktop sidebar
 * and the mobile bottom bar. Items with `disabled: true` are shown
 * as planned sections and are not routed yet (their pages are built
 * in later stages).
 *
 * Items with `roles` are only shown to a user who holds one of them.
 * The filtering happens in the interface — the server checks the role
 * again on every protected endpoint.
 */
export interface NavItem {
  /** Unique key. */
  key: string;
  label: string;
  /** Route path. Empty string while the section is not implemented. */
  path: string;
  icon: IconName;
  disabled: boolean;
  /** The roles that see this item. Empty — everyone sees it. */
  roles?: UserRole[];
}

export const mainNavItems: NavItem[] = [
  { key: 'home', label: 'Главная', path: '/', icon: 'home', disabled: false },
  { key: 'income', label: 'Доход', path: '/income', icon: 'wallet', disabled: true },
  { key: 'results', label: 'Результаты', path: '/results', icon: 'chart', disabled: true },
  { key: 'ranking', label: 'Рейтинг', path: '/ranking', icon: 'trophy', disabled: true },
  { key: 'tests', label: 'Тесты', path: '/tests', icon: 'graduation', disabled: true },
  { key: 'profile', label: 'Профиль', path: '/profile', icon: 'user', disabled: true },
];

/** The section only a curator or an administrator sees. */
export const curatorNavItems: NavItem[] = [
  {
    key: 'curator',
    label: 'Куратору',
    path: '/curator',
    icon: 'graduation',
    disabled: false,
    roles: ['curator', 'admin'],
  },
];

/** The section only an administrator sees. */
export const adminNavItems: NavItem[] = [
  {
    key: 'admin',
    label: 'Управление',
    path: '/admin',
    icon: 'settings',
    disabled: false,
    roles: ['admin'],
  },
];

/** True when the user may see the item. */
export function isNavItemVisible(item: NavItem, roles: UserRole[]): boolean {
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.some((role) => roles.includes(role));
}

/** The items the user may see, in the order they are shown. */
export function visibleNavItems(roles: UserRole[]): NavItem[] {
  return [...mainNavItems, ...curatorNavItems, ...adminNavItems].filter((item) =>
    isNavItemVisible(item, roles)
  );
}
