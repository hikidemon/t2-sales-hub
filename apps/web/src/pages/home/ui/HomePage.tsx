/**
 * Home page — the seller personal dashboard.
 *
 * Composition follows the T2 bento system: blocks of different shapes
 * rather than a uniform grid of identical cards. Glass surfaces carry
 * the data, neo blocks mark what needs attention.
 */

import { useCallback, useEffect, useState } from 'react';

import type {
  AppNotification,
  DashboardData,
  IntegrationDescriptor,
  Period,
  SyncStatus,
  TestWithState,
} from '@t2-sales-hub/core';
import { Card, CardContent, Icon, Toast, ToastViewport } from '@t2-sales-hub/ui';
import {
  loadAvailablePeriods,
  loadDashboard,
  loadIntegrations,
  loadMyTests,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  submitTestAttempt,
  type DashboardResponse,
} from '@/shared/api/dashboard';
import { signOut } from '@/shared/api/auth';
import { useAuth } from '@/features/auth';
import { DashboardHeader } from '@/widgets/dashboard-header';
import { DynamicsChartWidget } from '@/widgets/dynamics-chart';
import { ForecastWidget } from '@/widgets/forecast';
import { BonusBreakdownWidget, IncomeWidget } from '@/widgets/income-summary';
import { IntegrationsWidget } from '@/widgets/integrations';
import { KpiCardsWidget } from '@/widgets/kpi-cards';
import { MotivationWidget } from '@/widgets/motivation';
import { PlanProgressWidget } from '@/widgets/plan-progress';
import { QuizListWidget, QuizRunnerWidget } from '@/widgets/quiz';
import { RankingWidget } from '@/widgets/ranking';
import { RecentOperationsWidget } from '@/widgets/recent-operations';
import { SyncStatusWidget } from '@/widgets/sync-status';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; response: DashboardResponse };

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  variant: 'info' | 'success' | 'warning' | 'danger' | 'brand';
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Загрузка данных дашборда</span>
      <div className="h-40 animate-pulse rounded-2xl bg-background-card" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-border-secondary bg-background-card"
          />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-2xl border border-border-secondary bg-background-card" />
    </div>
  );
}

function DashboardErrorState({ message }: { message: string }) {
  return (
    <Card variant="outlined">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-bg text-danger-600">
          <Icon name="alert-triangle" size="lg" />
        </span>
        <p className="text-sm font-semibold">Не удалось загрузить данные</p>
        <p className="max-w-sm text-xs leading-relaxed text-text-tertiary">{message}</p>
      </CardContent>
    </Card>
  );
}

export function HomePage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [periodId, setPeriodId] = useState<string | undefined>(undefined);
  const [availablePeriods, setAvailablePeriods] = useState<Period[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [tests, setTests] = useState<TestWithState[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationDescriptor[]>([]);
  const [activeTest, setActiveTest] = useState<TestWithState | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { ...toast, id }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 6000);
  }, []);

  const loadEngagement = useCallback(async () => {
    const [notificationResponse, testResponse, integrationResponse] = await Promise.all([
      loadNotifications(),
      loadMyTests(),
      loadIntegrations(),
    ]);

    if (notificationResponse) {
      setNotifications(notificationResponse.items);
    }
    if (testResponse) {
      setTests(testResponse.items);
    }
    if (integrationResponse) {
      setIntegrations(integrationResponse.items);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const response = await loadDashboard(periodId);
        if (isActive) {
          setState({ status: 'ready', response });
          setSyncStatus(response.meta.status);
          setCapturedAt(response.meta.capturedAt);
        }
      } catch (error: unknown) {
        if (isActive) {
          setState({
            status: 'error',
            message:
              error instanceof Error ? error.message : 'Неизвестная ошибка источника данных.',
          });
        }
      }
    })();

    void loadEngagement();

    return () => {
      isActive = false;
    };
  }, [periodId, loadEngagement]);

  // The period switcher is built from the periods the source can serve.
  useEffect(() => {
    let isActive = true;

    void loadAvailablePeriods().then((periods) => {
      if (isActive) {
        setAvailablePeriods(periods);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  // The identity of the signed-in user comes from the session, which
  // the auth provider has already resolved.
  const { user: signedInUser, config: authConfig } = useAuth();
  const providerName = signedInUser ? authConfig?.providerName : undefined;

  const handlePeriodChange = useCallback((nextPeriodId: string) => {
    setPeriodId(nextPeriodId);
  }, []);

  const handleRefresh = useCallback(() => {
    void (async () => {
      const response = await loadDashboard(periodId);
      setState({ status: 'ready', response });
      setSyncStatus(response.meta.status);
      setCapturedAt(response.meta.capturedAt);
      pushToast({
        title: 'Данные обновлены',
        description: 'Получен актуальный срез по выбранному периоду.',
        variant: 'success',
      });
    })();
  }, [periodId, pushToast]);

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    void markNotificationRead(id);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    void markAllNotificationsRead();
  }, []);

  const handleNotificationOpen = useCallback(
    (notification: AppNotification) => {
      if (notification.category === 'test') {
        pushToast({
          title: 'Открыт раздел тестов',
          description: 'Пройдите назначенный тест в разделе «Тесты».',
          variant: 'brand',
        });
      }
    },
    [pushToast]
  );

  const handleSubmitTest = useCallback(
    async (answers: Record<string, string>) => {
      if (!activeTest) return;

      const result = await submitTestAttempt(activeTest.id, answers, Date.now() - 60_000);

      if (!result) {
        pushToast({
          title: 'Не удалось отправить ответы',
          description: 'Проверьте соединение с сервером и попробуйте снова.',
          variant: 'danger',
        });
        return;
      }

      setActiveTest(null);
      await loadEngagement();
      pushToast({
        title: result.passed ? 'Тест пройден' : 'Тест не пройден',
        description: `Ваш результат — ${result.scorePercent} %.`,
        variant: result.passed ? 'success' : 'warning',
      });
    },
    [activeTest, loadEngagement, pushToast]
  );

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-28 animate-pulse rounded-2xl bg-background-card" />
        <DashboardSkeleton />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-28 animate-pulse rounded-2xl bg-background-card" />
        <DashboardErrorState message={state.message} />
      </div>
    );
  }

  const data: DashboardData = state.response.data;
  const dynamics = data.dynamics[0];
  const remainingDays = Math.max(data.period.totalDays - data.period.elapsedDays, 0);
  const dailyAverage =
    data.period.elapsedDays > 0 ? data.income.total / data.period.elapsedDays : 0;
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const pendingTests = tests.filter(
    (item) => item.state === 'assigned' || item.state === 'in-progress'
  );

  return (
    <>
      <ToastViewport>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            variant={toast.variant}
            title={toast.title}
            description={toast.description}
            onDismiss={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
          />
        ))}
      </ToastViewport>

      <div className="flex flex-col gap-6">
        <DashboardHeader
          seller={data.seller}
          period={data.period}
          availablePeriods={availablePeriods as Period[]}
          onPeriodChange={handlePeriodChange}
          unreadCount={unreadCount}
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onNotificationOpen={handleNotificationOpen}
          signedInUser={
            signedInUser
              ? {
                  displayName: signedInUser.displayName,
                  position: signedInUser.position,
                  region: signedInUser.region,
                }
              : null
          }
          providerName={providerName}
          onSignOut={() => {
            void signOut().then(() => {
              window.location.reload();
            });
          }}
        />

        <SyncStatusWidget status={syncStatus} capturedAt={capturedAt} onRefresh={handleRefresh} />

        <IncomeWidget income={data.income} periodLabel={data.period.label} />

        <KpiCardsWidget kpis={data.kpis} />

        {/* Bento: a wide chart next to the plan progress */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {dynamics && (
              <DynamicsChartWidget
                dynamics={dynamics}
                referenceValue={Math.round(dailyAverage)}
                referenceLabel="среднее в день"
              />
            )}
          </div>
          <PlanProgressWidget
            plan={data.plan}
            elapsedDays={data.period.elapsedDays}
            totalDays={data.period.totalDays}
          />
        </div>

        {/* Bento: ranking and forecast as equal modules */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RankingWidget ranking={data.ranking} />
          <ForecastWidget forecast={data.forecast} />
        </div>

        <BonusBreakdownWidget income={data.income} />

        {/* Assigned tests — the neo block marks what needs action */}
        {pendingTests.length > 0 && (
          <section aria-labelledby="pending-tests-heading" className="flex flex-col gap-3">
            <h2 id="pending-tests-heading" className="font-display text-lg">
              Требуют вашего внимания
            </h2>
            <QuizListWidget tests={pendingTests} onTake={setActiveTest} />
          </section>
        )}

        {activeTest && (
          <QuizRunnerWidget
            test={activeTest}
            onSubmit={handleSubmitTest}
            onClose={() => setActiveTest(null)}
          />
        )}

        <MotivationWidget plan={data.plan} remainingDays={remainingDays} />

        <RecentOperationsWidget operations={data.recentOperations} />

        <section aria-labelledby="integrations-heading" className="flex flex-col gap-3">
          <h2 id="integrations-heading" className="font-display text-lg">
            Интеграции
          </h2>
          <IntegrationsWidget integrations={integrations} />
        </section>

        <p className="pb-2 text-center text-[0.6875rem] leading-relaxed text-text-muted">
          T2 Sales Hub — независимый демонстрационный проект. Не является официальным продуктом T2.
          Все расчёты выполнены по демо-правилам.
        </p>
      </div>
    </>
  );
}
