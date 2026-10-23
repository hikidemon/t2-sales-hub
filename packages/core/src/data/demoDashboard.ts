/**
 * Synthetic demo dataset for the seller dashboard.
 *
 * Every number here is fabricated. No real employee data, no 1C,
 * no Google Sheets. The dataset is internally consistent: plan
 * progress, bonuses, forecast and ranking are derived from the same
 * base figures by the demo rules in `calculation/demoRules.ts`.
 */

import {
  calculateBeatsPercent,
  calculateForecast,
  calculateForecastConfidence,
  calculatePlanPercent,
  calculatePlanRemaining,
} from '../calculation/demoRules.js';
import type {
  BonusItem,
  DashboardData,
  Kpi,
  MetricDynamics,
  Period,
  RankingEntry,
  SalesOperation,
  Seller,
} from '../domain/dashboard.js';

const DEMO_SELLER: Seller = {
  id: 'DEMO-0001',
  name: 'Анна Петрова',
  position: 'Продавец-консультант',
  region: 'Демонстрационный салон',
  initials: 'АП',
};

interface PeriodSeed {
  period: Period;
  base: number;
  bonuses: BonusItem[];
  planTarget: number;
  dailyIncome: number[];
  operations: SalesOperation[];
}

const PERIOD_SEEDS: PeriodSeed[] = [
  {
    period: {
      id: '2026-10',
      label: 'Октябрь 2026',
      shortLabel: 'окт. 2026',
      startDate: '2026-10-01',
      totalDays: 31,
      elapsedDays: 21,
    },
    base: 98_320,
    bonuses: [
      {
        id: 'b-season',
        title: 'Сезонная премия',
        amount: 30_000,
        status: 'earned',
        basis: 'Демо-правило: премия за выполнение месячного плана на 85%',
      },
      {
        id: 'b-new-client',
        title: 'Новый постоянный клиент',
        amount: 8_000,
        status: 'earned',
        basis: 'Демо-правило: фиксированная надбавка за привлечение клиента',
      },
      {
        id: 'b-loyalty',
        title: 'Программа лояльности',
        amount: 12_000,
        status: 'earned',
        basis: 'Демо-правило: накопительные баллы лояльности, конвертированные в рубли',
      },
      {
        id: 'b-growth',
        title: 'Рост продаж к прошлому периоду',
        amount: 8_000,
        status: 'pending',
        basis: 'Демо-правило: начисляется в начале следующего периода',
      },
    ],
    planTarget: 165_000,
    dailyIncome: [4_200, 6_800, 5_400, 9_100, 7_600, 8_300, 4_900, 10_200, 7_400, 9_800],
    operations: [
      {
        id: 'op-1',
        title: 'Смартфон Alpha X',
        amount: 89_990,
        date: '2026-10-20',
        type: 'sale',
      },
      {
        id: 'op-2',
        title: 'Чехол и защитное стекло',
        amount: 3_490,
        date: '2026-10-20',
        type: 'sale',
      },
      {
        id: 'op-3',
        title: 'Наушники Pro',
        amount: 15_990,
        date: '2026-10-19',
        type: 'sale',
      },
      {
        id: 'op-4',
        title: 'Смартфон Beta Pro',
        amount: 129_990,
        date: '2026-10-18',
        type: 'sale',
      },
      {
        id: 'op-5',
        title: 'Корректировка возврата',
        amount: -2_400,
        date: '2026-10-17',
        type: 'correction',
      },
    ],
  },
  {
    period: {
      id: '2026-09',
      label: 'Сентябрь 2026',
      shortLabel: 'сен. 2026',
      startDate: '2026-09-01',
      totalDays: 30,
      elapsedDays: 30,
    },
    base: 92_000,
    bonuses: [
      {
        id: 'b-season-09',
        title: 'Сезонная премия',
        amount: 24_000,
        status: 'earned',
        basis: 'Демо-правило: премия за выполнение месячного плана на 85%',
      },
      {
        id: 'b-new-client-09',
        title: 'Новый постоянный клиент',
        amount: 6_000,
        status: 'earned',
        basis: 'Демо-правило: фиксированная надбавка за привлечение клиента',
      },
      {
        id: 'b-loyalty-09',
        title: 'Программа лояльности',
        amount: 9_500,
        status: 'earned',
        basis: 'Демо-правило: накопительные баллы лояльности, конвертированные в рубли',
      },
    ],
    planTarget: 150_000,
    dailyIncome: [5_100, 7_200, 6_400, 8_100, 7_800, 5_900, 9_400, 6_700, 8_200, 4_600],
    operations: [
      {
        id: 'op-6',
        title: 'Смартфон Gamma Mini',
        amount: 49_990,
        date: '2026-09-29',
        type: 'sale',
      },
      {
        id: 'op-7',
        title: 'Планшет Slate 11',
        amount: 74_990,
        date: '2026-09-27',
        type: 'sale',
      },
      {
        id: 'op-8',
        title: 'Аксессуары к смартфонам',
        amount: 5_300,
        date: '2026-09-25',
        type: 'sale',
      },
    ],
  },
  {
    period: {
      id: '2026-08',
      label: 'Август 2026',
      shortLabel: 'авг. 2026',
      startDate: '2026-08-01',
      totalDays: 31,
      elapsedDays: 31,
    },
    base: 88_000,
    bonuses: [
      {
        id: 'b-season-08',
        title: 'Сезонная премия',
        amount: 18_500,
        status: 'earned',
        basis: 'Демо-правило: премия за выполнение месячного плана на 85%',
      },
      {
        id: 'b-loyalty-08',
        title: 'Программа лояльности',
        amount: 7_200,
        status: 'earned',
        basis: 'Демо-правило: накопительные баллы лояльности, конвертированные в рубли',
      },
    ],
    planTarget: 140_000,
    dailyIncome: [4_800, 6_100, 7_300, 5_900, 6_700, 8_200, 4_100, 7_800, 6_300, 5_400],
    operations: [
      {
        id: 'op-9',
        title: 'Смартфон Delta S',
        amount: 69_990,
        date: '2026-08-30',
        type: 'sale',
      },
      {
        id: 'op-10',
        title: 'Умные часы Pulse',
        amount: 19_990,
        date: '2026-08-28',
        type: 'sale',
      },
    ],
  },
];

function sumBonuses(bonuses: BonusItem[], status: BonusItem['status']): number {
  return bonuses
    .filter((bonus) => bonus.status === status)
    .reduce((sum, bonus) => sum + bonus.amount, 0);
}

function buildKpis({
  total,
  earnedBonusTotal,
  planPercent,
  previousTotal,
  operations,
}: {
  total: number;
  earnedBonusTotal: number;
  planPercent: number;
  previousTotal: number;
  operations: SalesOperation[];
}): Kpi[] {
  const delta = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;
  const bonusShare = total > 0 ? (earnedBonusTotal / total) * 100 : 0;
  const salesCount = operations.filter((operation) => operation.type === 'sale').length;

  return [
    {
      id: 'bonus-share',
      label: 'Доля бонусов в доходе',
      value: Math.round(bonusShare * 10) / 10,
      unit: 'percent',
      hint: 'Демо-метрика: бонусы делённые на общий доход периода',
    },
    {
      id: 'plan-progress',
      label: 'Выполнение плана',
      value: planPercent,
      unit: 'percent',
      hint: 'Демо-метрика: доход к целевому плану периода',
    },
    {
      id: 'income-delta',
      label: 'Изменение к прошлому периоду',
      value: Math.round(delta * 10) / 10,
      unit: 'percent',
      hint: 'Демо-метрика: сравнение дохода с предыдущим периодом',
    },
    {
      id: 'operations-count',
      label: 'Операций за период',
      value: salesCount,
      unit: 'number',
      hint: 'Демо-метрика: количество продаж в ленте операций',
    },
  ];
}

function buildDynamics(seed: PeriodSeed, total: number): MetricDynamics[] {
  const daily = seed.dailyIncome;
  const sum = daily.reduce((acc, value) => acc + value, 0) || 1;

  // Demo rule: the 10 demo days are distributed across the elapsed
  // days of the period proportionally, so the series always adds up
  // to the period income.
  const perDay = total / sum;
  const dailyPoints = daily.map((value, index) => ({
    label: `День ${Math.round(((index + 1) / daily.length) * seed.period.elapsedDays)}`,
    value: Math.round(value * perDay),
  }));

  return [
    {
      id: 'daily-income',
      title: 'Доход по дням периода',
      unit: 'currency',
      points: dailyPoints,
    },
  ];
}

function buildRanking(total: number): RankingEntry[] {
  const leaderboard: Array<{ name: string; amount: number }> = [
    { name: 'Демо-агент 12', amount: Math.round(total * 1.18) },
    { name: 'Демо-агент 31', amount: Math.round(total * 1.09) },
    { name: 'Демо-агент 05', amount: Math.round(total * 1.02) },
    { name: DEMO_SELLER.name, amount: total },
    { name: 'Демо-агент 44', amount: Math.round(total * 0.94) },
  ];

  return leaderboard.map((entry, index) => ({
    position: index + 1,
    sellerName: entry.name,
    amount: entry.amount,
    isCurrentSeller: entry.name === DEMO_SELLER.name,
  }));
}

function buildDashboardData(seed: PeriodSeed, previousTotal: number): DashboardData {
  const earnedBonusTotal = sumBonuses(seed.bonuses, 'earned');
  const pendingBonusTotal = sumBonuses(seed.bonuses, 'pending');
  const total = seed.base + earnedBonusTotal;

  const planPercent = calculatePlanPercent(total, seed.planTarget);
  const forecast = calculateForecast({
    current: total,
    elapsedDays: seed.period.elapsedDays,
    totalDays: seed.period.totalDays,
    paceFactor: 0.9,
  });

  const position = 4;
  const totalAgents = 47;

  return {
    period: seed.period,
    seller: DEMO_SELLER,
    income: {
      base: seed.base,
      bonuses: seed.bonuses,
      earnedBonusTotal,
      pendingBonusTotal,
      total,
    },
    plan: {
      current: total,
      target: seed.planTarget,
      percent: planPercent,
      remaining: calculatePlanRemaining(total, seed.planTarget),
    },
    kpis: buildKpis({
      total,
      earnedBonusTotal,
      planPercent,
      previousTotal,
      operations: seed.operations,
    }),
    dynamics: buildDynamics(seed, total),
    ranking: {
      position,
      total: totalAgents,
      beatsPercent: calculateBeatsPercent(position, totalAgents),
      top: buildRanking(total),
    },
    forecast: {
      expectedTotal: forecast.expectedTotal,
      expectedAdditional: forecast.expectedAdditional,
      basis:
        'Демо-расчёт: линейная экстраполяция среднего дневного дохода с понижающим коэффициентом темпа 0,9.',
      confidence: calculateForecastConfidence(
        total,
        seed.planTarget,
        seed.period.elapsedDays,
        seed.period.totalDays
      ),
    },
    recentOperations: seed.operations,
  };
}

/** All demo periods, newest first. */
export const demoPeriods: Period[] = PERIOD_SEEDS.map((seed) => seed.period);

/**
 * Builds the dashboard dataset for a period.
 * Falls back to the newest period for an unknown id.
 */
export function buildDemoDashboard(periodId?: string): DashboardData {
  const index = periodId ? PERIOD_SEEDS.findIndex((seed) => seed.period.id === periodId) : 0;
  const resolvedIndex = index >= 0 ? index : 0;
  const seed = PERIOD_SEEDS[resolvedIndex] as PeriodSeed;
  const previousSeed = PERIOD_SEEDS[resolvedIndex + 1];
  const previousTotal = previousSeed
    ? previousSeed.base + sumBonuses(previousSeed.bonuses, 'earned')
    : 0;

  return buildDashboardData(seed, previousTotal);
}
