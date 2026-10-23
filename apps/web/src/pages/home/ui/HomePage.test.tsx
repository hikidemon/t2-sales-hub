import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { HomePage } from './HomePage';
import type * as DashboardApi from '@/shared/api/dashboard';

const loadDashboard = vi.fn();
const loadSyncStatus = vi.fn();

vi.mock('@/shared/api/dashboard', async (importOriginal) => {
  const actual = await importOriginal<typeof DashboardApi>();
  return {
    ...actual,
    loadDashboard: (...args: unknown[]) => loadDashboard(...args),
    loadSyncStatus: (...args: unknown[]) => loadSyncStatus(...args),
  };
});

const DASHBOARD = {
  data: {
    period: {
      id: '2026-10',
      label: 'Октябрь 2026',
      shortLabel: 'окт. 2026',
      startDate: '2026-10-01',
      totalDays: 31,
      elapsedDays: 20,
    },
    seller: {
      id: 'DEMO-0001',
      name: 'Анна Петрова',
      position: 'Продавец-консультант',
      region: 'Новосибирск',
      initials: 'АП',
    },
    income: {
      base: 98_320,
      bonuses: [
        {
          id: 'b1',
          title: 'Сезонная премия',
          amount: 30_000,
          status: 'earned' as const,
          basis: 'Демо-правило',
        },
      ],
      earnedBonusTotal: 30_000,
      pendingBonusTotal: 8_000,
      total: 128_320,
    },
    plan: { current: 128_320, target: 165_000, percent: 77.8, remaining: 36_680 },
    kpis: [
      {
        id: 'sym',
        label: 'Сим',
        value: 68,
        unit: 'currency' as const,
        hint: 'Демо-метрика',
      },
    ],
    dynamics: [
      {
        id: 'daily-income',
        title: 'Доход по дням периода',
        unit: 'currency' as const,
        points: [{ label: 'День 1', value: 1000 }],
      },
    ],
    ranking: {
      position: 4,
      total: 47,
      beatsPercent: 91.5,
      top: [],
    },
    forecast: {
      expectedTotal: 200_000,
      expectedAdditional: 70_000,
      basis: 'Демо-расчёт',
      confidence: 'medium' as const,
    },
    recentOperations: [],
  },
  meta: {
    capturedAt: '2026-10-21T10:00:00.000Z',
    source: 'google-sheets' as const,
    status: {
      state: 'ok' as const,
      source: 'google-sheets' as const,
      lastSuccessAt: '2026-10-21T10:00:00.000Z',
      lastAttemptAt: '2026-10-21T10:00:00.000Z',
      lastDurationMs: 500,
      lastError: null,
      consecutiveFailures: 0,
      intervalMs: 300_000,
      servingStaleData: false,
    },
  },
};

async function renderDashboard() {
  render(<HomePage />);
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Личный кабинет продавца' })).toBeInTheDocument();
  });
}

describe('HomePage', () => {
  beforeEach(() => {
    loadDashboard.mockReset();
    loadDashboard.mockResolvedValue(DASHBOARD);
    loadSyncStatus.mockReset();
    loadSyncStatus.mockResolvedValue(DASHBOARD.meta.status);
  });

  it('renders the headline income after loading', async () => {
    await renderDashboard();

    // The headline is a labelled figure rather than a heading.
    const label = screen.getByText(/Общий заработок за/i);
    const block = label.closest('div')?.parentElement;
    expect(block).not.toBeNull();
    expect(within(block as HTMLElement).getByText('128 320 ₽')).toBeInTheDocument();
  });

  it('shows the plan progress, ranking and forecast sections', async () => {
    await renderDashboard();

    expect(screen.getByRole('heading', { name: 'Выполнение плана' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Позиция в рейтинге' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Прогноз до конца периода' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Детализация бонусов' })).toBeInTheDocument();
  });

  it('shows the data source and the last refresh time', async () => {
    await renderDashboard();

    expect(screen.getByText('Источник данных')).toBeInTheDocument();
    expect(screen.getByText(/Google Sheets/)).toBeInTheDocument();
    expect(screen.getByText('Актуально')).toBeInTheDocument();
  });

  it('reloads the dataset when another period is selected', async () => {
    await renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: 'сен. 2026' }));

    await waitFor(() => {
      expect(loadDashboard).toHaveBeenCalledWith('2026-09');
    });
  });

  it('reloads the dataset when the refresh button is pressed', async () => {
    await renderDashboard();

    const callsBefore = loadDashboard.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /Обновить данные/ }));

    await waitFor(() => {
      expect(loadDashboard.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('opens the demo profile panel on demand', async () => {
    await renderDashboard();

    const toggle = screen.getByRole('button', { name: 'Меню профиля' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Демонстрационный профиль')).toBeInTheDocument();
  });
});
