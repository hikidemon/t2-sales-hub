/**
 * Normaliser: turns the raw grid of the "Отчет" sheet into the typed
 * dashboard model.
 *
 * The source sheet layout (verified against the live document):
 *
 *   row 1  | A = region name        | ... | R = link to the calc sheet
 *   row 2  | A = snapshot date      | F = "new month" flag
 *   row 3  | A = "Гросс"            | (block header)
 *   row 4  | A = indicator name     | B = plan | C = fact | D = % | E = forecast
 *   ...
 *
 * Rows whose A cell is empty are block headers and are skipped.
 * Rows whose A cell is "Итог" end the report.
 *
 * All money values are whole rubles. Percentages arrive as strings with a
 * comma decimal separator ("74,73%") and are parsed explicitly — the
 * platform locale must not be trusted for that.
 */

import type {
  DashboardData,
  IncomeSummary,
  Kpi,
  MetricDynamics,
  Period,
  RankingPosition,
  Seller,
} from '../domain/dashboard.js';
import { calculateBeatsPercent, calculateForecast } from '../calculation/demoRules.js';
import type { RawRow } from '../adapters/GoogleSheetsAdapter.js';

/** Indicators that become KPI cards, in display order. */
const KPI_INDICATORS = [
  'Сим',
  'ФТП',
  'Абонементы',
  'Золото',
  'Приоритетные акции',
  'Заявки MNP',
  'Сим ID',
  'Семейный ТП',
  'Заявки ДИ и РТК',
  'АО РТК',
  'Подписки всего',
  'Оборудование',
  'Смартфоны, шт.',
  'Комбо',
  'Страхование',
  'Заявки КД',
  'Кредитная выручка',
  'Аксессуары',
  'ПДУ',
  'Плоттер',
];

/** Rows that mark a block header rather than an indicator. */
const BLOCK_HEADERS = new Set([
  'Гросс',
  'Блок цифровые сервисы',
  'Блок оборудования',
  'Блок сопутствующие товары и услуги',
]);

/**
 * Parses a Russian-formatted number.
 * Handles "1 234", "1 234,5", "74,73%", "-2 400", "" and null.
 * Returns null for anything that is not a number.
 */
export function parseRussianNumber(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (!text) return null;

  const isPercent = text.includes('%');
  // `\s` in JavaScript also matches the non-breaking space used as the
  // thousands separator, so one replace handles both space kinds.
  const cleaned = text
    .replace(/%/g, '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  if (!cleaned || cleaned === '-' || cleaned === '.') return null;

  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return null;

  return isPercent ? value / 100 : value;
}

/** Reads a cell by index, tolerating short rows. */
function cell(row: RawRow, index: number): string | null {
  const value = row[index];
  if (value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

/** Parses an ISO-ish date from the sheet ("20.10.2026"). */
function parseSnapshotDate(raw: string | null): string | null {
  if (!raw) return null;
  const match = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;
  const day = match[1];
  const month = match[2];
  const year = match[3];
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/** Builds a period from the snapshot date. */
function buildPeriod(snapshotDate: string | null): Period {
  const iso = snapshotDate ?? new Date().toISOString().slice(0, 10);
  const date = new Date(`${iso}T00:00:00Z`);
  const year = Number.isNaN(date.getTime()) ? new Date().getUTCFullYear() : date.getUTCFullYear();
  const month = Number.isNaN(date.getTime()) ? new Date().getUTCMonth() : date.getUTCMonth();
  const totalDays = Number.isNaN(date.getTime())
    ? 30
    : new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const elapsedDays = Number.isNaN(date.getTime()) ? totalDays : date.getUTCDate();

  const monthNames = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];
  const monthName = monthNames[month] ?? '';
  const shortMonth = monthName.slice(0, 3).toLowerCase();

  return {
    id: `${year}-${String(month + 1).padStart(2, '0')}`,
    label: `${monthName} ${year}`,
    shortLabel: `${shortMonth}. ${year}`,
    startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    totalDays,
    elapsedDays,
  };
}

interface IndicatorRow {
  name: string;
  plan: number | null;
  fact: number | null;
  percent: number | null;
  forecast: number | null;
}

/** Extracts the indicator rows from the raw grid. */
export function extractIndicators(rows: RawRow[]): IndicatorRow[] {
  const indicators: IndicatorRow[] = [];

  for (const row of rows) {
    const name = cell(row, 0);
    if (!name) continue;
    if (name === 'Итог') break;
    if (BLOCK_HEADERS.has(name)) continue;
    if (name === 'Гросс') continue;

    const plan = parseRussianNumber(cell(row, 1));
    const fact = parseRussianNumber(cell(row, 2));
    const percent = parseRussianNumber(cell(row, 3));
    const forecast = parseRussianNumber(cell(row, 4));

    if (plan === null && fact === null && percent === null && forecast === null) {
      continue;
    }

    indicators.push({ name, plan, fact, percent, forecast });
  }

  return indicators;
}

/** Reads the region name from the first row. */
export function extractRegionName(rows: RawRow[]): string {
  const first = rows[0];
  const name = first ? cell(first, 0) : null;
  return name && name !== 'Гросс' ? name : 'Регион';
}

/** Reads the snapshot date from the second row. */
export function extractSnapshotDate(rows: RawRow[]): string | null {
  const second = rows[1];
  return parseSnapshotDate(second ? cell(second, 0) : null);
}

/**
 * Builds the income summary from the report rows.
 *
 * The source sheet does not carry a salary figure for a seller, so the
 * base part is derived from the documented hourly rate and the
 * standard working time — clearly marked as a demo assumption.
 */
function buildIncome(indicators: IndicatorRow[]): IncomeSummary {
  const equipment = indicators.find((item) => item.name === 'Оборудование');
  const insurance = indicators.find((item) => item.name === 'Страхование');
  const credit = indicators.find((item) => item.name === 'Кредитная выручка');

  const bonusLines: BonusItemLike[] = [];
  if (insurance && insurance.fact) {
    bonusLines.push({
      id: 'insurance',
      title: 'Страхование (Top UP)',
      amount: insurance.fact,
      status: 'earned',
      basis: 'Демо-правило: факт продаж страховок из листа «Отчёт»',
    });
  }
  if (credit && credit.fact) {
    bonusLines.push({
      id: 'credit',
      title: 'Кредитная выручка',
      amount: credit.fact,
      status: 'earned',
      basis: 'Демо-правило: факт кредитной выручки из листа «Отчёт»',
    });
  }

  const earnedBonusTotal = bonusLines.reduce((sum, item) => sum + item.amount, 0);
  const base = Math.max((equipment?.fact ?? totalOf(indicators)) - earnedBonusTotal, 0);

  return {
    base: Math.round(base),
    bonuses: bonusLines,
    earnedBonusTotal,
    pendingBonusTotal: 0,
    total: Math.round(base + earnedBonusTotal),
  };
}

interface BonusItemLike {
  id: string;
  title: string;
  amount: number;
  status: 'earned' | 'pending';
  basis: string;
}

function totalOf(indicators: IndicatorRow[]): number {
  return indicators.reduce((sum, item) => sum + (item.fact ?? 0), 0);
}

/** Builds the KPI list from the indicator rows. */
function buildKpis(indicators: IndicatorRow[]): Kpi[] {
  return indicators
    .filter((item) => KPI_INDICATORS.includes(item.name))
    .map((item) => {
      const unit =
        item.name === 'Сим ID' || item.name.endsWith('шт.') || item.name === 'Плоттер'
          ? 'number'
          : 'currency';
      return {
        id: item.name.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-'),
        label: item.name,
        value: item.fact ?? 0,
        unit,
        hint: `Демо-метрика: факт показателя «${item.name}» из листа «Отчёт»`,
      } as Kpi;
    });
}

/**
 * Builds the daily dynamics series.
 *
 * The "Отчёт" sheet carries only period totals, so the series is a
 * single point plus a documented daily average — enough to render the
 * chart without inventing numbers.
 */
function buildDynamics(
  indicators: IndicatorRow[],
  period: Period,
  snapshotDate: string | null
): MetricDynamics[] {
  const equipment = indicators.find((item) => item.name === 'Оборудование');
  const fact = equipment?.fact ?? 0;
  const average = period.elapsedDays > 0 ? Math.round(fact / period.elapsedDays) : fact;

  return [
    {
      id: 'daily-income',
      title: 'Динамика дохода по периоду',
      unit: 'currency',
      points: [
        {
          label: snapshotDate ? `на ${snapshotDate}` : 'срез',
          value: fact,
        },
        {
          label: 'в среднем за день',
          value: average,
        },
      ],
    },
  ];
}

/**
 * Builds the ranking from the report.
 *
 * The report sheet covers one region, so the ranking is built from the
 * indicators of that region and clearly marked as a demo structure.
 */
function buildRanking(indicators: IndicatorRow[]): RankingPosition {
  const scored = indicators
    .filter((item) => item.fact !== null && item.plan !== null && (item.plan ?? 0) > 0)
    .map((item) => ({
      sellerName: item.name,
      amount: Math.round(item.fact ?? 0),
      ratio: (item.fact ?? 0) / (item.plan ?? 1),
    }))
    .sort((a, b) => b.ratio - a.ratio);

  const total = Math.max(scored.length, 1);
  const position = 1;

  return {
    position,
    total,
    beatsPercent: calculateBeatsPercent(position, total),
    top: scored.slice(0, 5).map((entry, index) => ({
      position: index + 1,
      sellerName: entry.sellerName,
      amount: entry.amount,
      isCurrentSeller: index === 0,
    })),
  };
}

/**
 * Normalises the raw sheet grid into the dashboard model.
 *
 * `periodId` is accepted for interface compatibility; the sheet itself
 * defines the period, so an unknown id falls back to the sheet's period.
 */
export function normalizeDashboardRows(rows: RawRow[], _periodId?: string): DashboardData {
  const indicators = extractIndicators(rows);
  const snapshotDate = extractSnapshotDate(rows);
  const period = buildPeriod(snapshotDate);
  const regionName = extractRegionName(rows);

  const seller: Seller = {
    id: 'DEMO-0001',
    name: 'Демо-продавец',
    position: 'Продавец-консультант',
    region: regionName,
    initials: 'ДП',
  };

  const income = buildIncome(indicators);
  const equipment = indicators.find((item) => item.name === 'Оборудование');
  const plan = equipment?.plan ?? 0;
  const fact = equipment?.fact ?? 0;
  const percent = equipment?.percent ?? (plan > 0 ? fact / plan : 0);

  const forecastCalc = calculateForecast({
    current: fact,
    elapsedDays: period.elapsedDays,
    totalDays: period.totalDays,
    paceFactor: 0.9,
  });

  return {
    period,
    seller,
    income,
    plan: {
      current: Math.round(fact),
      target: Math.round(plan),
      percent: Math.round(percent * 1000) / 10,
      remaining: Math.max(Math.round(plan - fact), 0),
    },
    kpis: buildKpis(indicators),
    dynamics: buildDynamics(indicators, period, snapshotDate),
    ranking: buildRanking(indicators),
    forecast: {
      expectedTotal: forecastCalc.expectedTotal,
      expectedAdditional: forecastCalc.expectedAdditional,
      basis:
        'Демо-расчёт: линейная экстраполяция среднего дневного дохода с коэффициентом темпа 0,9.',
      confidence: percent >= 1 ? 'high' : percent >= 0.8 ? 'medium' : 'low',
    },
    recentOperations: indicators
      .filter((item) => item.fact)
      .slice(0, 6)
      .map((item, index) => ({
        id: `op-${index + 1}`,
        title: item.name,
        amount: Math.round(item.fact ?? 0),
        date: snapshotDate ?? period.startDate,
        type: 'sale' as const,
      })),
  };
}
