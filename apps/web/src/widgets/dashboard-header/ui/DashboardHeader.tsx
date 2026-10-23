/**
 * Dashboard header — the top bar of the seller dashboard: title, period
 * switcher, notification bell and the profile of the signed-in user.
 *
 * The profile comes from the session (the ABC T2 portal), not from the
 * dataset: the identity of the person and the data they work with are
 * two different things.
 */

import { useState } from 'react';

import type { AppNotification, Period, Seller } from '@t2-sales-hub/core';
import { Avatar, Badge, Icon } from '@t2-sales-hub/ui';
import { getSellerInitials } from '@/entities/employee';
import { NotificationBell } from '@/widgets/notification-bell';

export interface DashboardHeaderProps {
  seller: Seller;
  period: Period;
  availablePeriods: Period[];
  onPeriodChange: (periodId: string) => void;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNotificationOpen?: (notification: AppNotification) => void;
  /** The signed-in user, when the session exists. */
  signedInUser?: {
    displayName: string;
    position?: string;
    region?: string;
    initials?: string;
  } | null;
  /** The name of the provider the session comes from. */
  providerName?: string;
  onSignOut?: () => void;
}

export function DashboardHeader({
  seller,
  period,
  availablePeriods,
  onPeriodChange,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onNotificationOpen,
  signedInUser,
  providerName,
  onSignOut,
}: DashboardHeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const displayName = signedInUser?.displayName ?? seller.name;
  const position = signedInUser?.position ?? seller.position;
  const region = signedInUser?.region ?? seller.region;
  const initials = signedInUser?.initials ?? getSellerInitials({ ...seller, name: displayName });

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl tracking-tight md:text-3xl">
            Личный кабинет продавца
          </h1>
          <p className="text-sm text-text-tertiary">
            Доход, план и динамика показателей за выбранный период
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period switcher — the data really changes with the period */}
          <div
            className="flex items-center gap-1 rounded-xl border border-border-secondary bg-background-card p-1"
            role="group"
            aria-label="Выбор периода"
          >
            {availablePeriods.map((item) => {
              const isActive = item.id === period.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPeriodChange(item.id)}
                  aria-pressed={isActive}
                  className={
                    isActive
                      ? 'rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors'
                      : 'rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-tertiary transition-colors hover:bg-background-tertiary hover:text-text-primary'
                  }
                >
                  {item.shortLabel}
                </button>
              );
            })}
          </div>

          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={onMarkRead}
            onMarkAllRead={onMarkAllRead}
            onOpen={onNotificationOpen}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-secondary bg-background-card p-3 md:p-4">
        <Avatar fallback={initials} size="md" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="truncate text-xs text-text-tertiary">
            {position} · {region}
          </p>
        </div>

        {providerName ? (
          <Badge variant="lime" size="sm" dot>
            {providerName}
          </Badge>
        ) : (
          <Badge variant="lime" size="sm" dot>
            демо-режим
          </Badge>
        )}

        <button
          type="button"
          onClick={() => setIsProfileOpen((open) => !open)}
          aria-expanded={isProfileOpen}
          aria-label="Меню профиля"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-secondary text-text-tertiary transition-colors hover:bg-background-tertiary hover:text-text-primary"
        >
          <Icon name={isProfileOpen ? 'close' : 'menu'} size="sm" />
        </button>

        {isProfileOpen && (
          <div className="w-full rounded-xl border border-border-secondary bg-background-tertiary p-3 text-xs leading-relaxed text-text-secondary">
            {signedInUser ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <p className="font-medium text-text-primary">{displayName}</p>
                  <p className="mt-0.5">
                    Учётная запись {providerName ?? 'ABC T2'} · сессия сохранена
                  </p>
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex items-center gap-1.5 rounded-lg border border-border-secondary px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-background-card hover:text-text-primary"
                  >
                    <Icon name="logout" size="sm" />
                    Выйти
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-text-primary">Демонстрационный профиль</p>
                <p>Авторизация в проекте не включена — вход выполняется в демо-режиме.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
