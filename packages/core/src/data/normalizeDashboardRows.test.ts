import { describe, expect, it } from 'vitest';

import {
  extractIndicators,
  extractRegionName,
  extractSnapshotDate,
  normalizeDashboardRows,
  parseRussianNumber,
} from './normalizeDashboardRows';

/** The real layout of the "Отчет" sheet, verified against the live document. */
const REPORT_ROWS = [
  [
    'Новосибирск',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'https://docs.google.com/spreadsheets/d/PLAN/edit',
  ],
  ['20.10.2026', '', '', '', '', 'FALSE', 'Нажать, если начался новый месяц'],
  ['Гросс'],
  ['Сим', '91', '68', '74,73%', '96,84%'],
  ['ФТП', '75', '33', '44,00%', '81,12%'],
  ['Абонементы', '7', '0', '0,00%', '20,99%'],
  ['Блок цифровые сервисы'],
  ['АО РТК', '9128', '9235', '101,17%', '68,34%'],
  ['Подписки всего', '4320', '4990', '115,51%', '78,63%'],
  ['Блок оборудования'],
  ['Оборудование', '119994', '64734', '53,95%', '104,43%'],
  ['Смартфоны, шт.', '6', '4', '66,67%', '107,73%'],
  ['Страхование', '49661', '3640', '7,33%', '41,07%'],
  ['Аксессуары', '74819', '27378', '36,59%', '69,44%'],
  ['Итог', '100', '200'],
];

describe('parseRussianNumber', () => {
  it('parses plain integers', () => {
    expect(parseRussianNumber('91')).toBe(91);
  });

  it('parses a non-breaking space as a thousands separator', () => {
    expect(parseRussianNumber('119 994')).toBe(119994);
  });

  it('parses a comma decimal separator', () => {
    expect(parseRussianNumber('64734,5')).toBe(64734.5);
  });

  it('converts a percentage into a ratio', () => {
    expect(parseRussianNumber('74,73%')).toBeCloseTo(0.7473, 4);
  });

  it('parses a negative amount', () => {
    expect(parseRussianNumber('-2 400')).toBe(-2400);
  });

  it('returns null for empty and non-numeric input', () => {
    expect(parseRussianNumber('')).toBeNull();
    expect(parseRussianNumber(null)).toBeNull();
    expect(parseRussianNumber('н/д')).toBeNull();
  });
});

describe('extractIndicators', () => {
  it('skips block headers and keeps indicator rows', () => {
    const indicators = extractIndicators(REPORT_ROWS);
    const names = indicators.map((item) => item.name);

    expect(names).not.toContain('Гросс');
    expect(names).not.toContain('Блок оборудования');
    expect(names).toContain('Оборудование');
    expect(names).toContain('Сим');
  });

  it('stops at the "Итог" row', () => {
    const indicators = extractIndicators(REPORT_ROWS);
    expect(indicators.map((item) => item.name)).not.toContain('Итог');
  });

  it('reads plan, fact, percent and forecast', () => {
    const equipment = extractIndicators(REPORT_ROWS).find((item) => item.name === 'Оборудование');

    expect(equipment?.plan).toBe(119994);
    expect(equipment?.fact).toBe(64734);
    expect(equipment?.percent).toBeCloseTo(0.5395, 4);
    expect(equipment?.forecast).toBeCloseTo(1.0443, 4);
  });
});

describe('extractRegionName and extractSnapshotDate', () => {
  it('reads the region name from the first row', () => {
    expect(extractRegionName(REPORT_ROWS)).toBe('Новосибирск');
  });

  it('reads the snapshot date from the second row', () => {
    expect(extractSnapshotDate(REPORT_ROWS)).toBe('2026-10-20');
  });
});

describe('normalizeDashboardRows', () => {
  const data = normalizeDashboardRows(REPORT_ROWS);

  it('builds the period from the snapshot date', () => {
    expect(data.period.id).toBe('2026-10');
    expect(data.period.label).toBe('Октябрь 2026');
    expect(data.period.totalDays).toBe(31);
    expect(data.period.elapsedDays).toBe(20);
  });

  it('derives the plan progress from the equipment indicator', () => {
    expect(data.plan.current).toBe(64734);
    expect(data.plan.target).toBe(119994);
    expect(data.plan.percent).toBeCloseTo(53.95, 1);
    expect(data.plan.remaining).toBe(55260);
  });

  it('keeps the income breakdown consistent with the total', () => {
    expect(data.income.total).toBe(data.income.base + data.income.earnedBonusTotal);
  });

  it('exposes the source indicators as KPI cards', () => {
    const labels = data.kpis.map((kpi) => kpi.label);
    expect(labels).toContain('Сим');
    expect(labels).toContain('Оборудование');
  });

  it('produces a forecast above the current fact', () => {
    expect(data.forecast.expectedTotal).toBeGreaterThan(data.plan.current);
    expect(data.forecast.basis).toContain('Демо-расчёт');
  });
});
