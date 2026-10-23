import { describe, expect, it } from 'vitest';

import {
  calculateBaseSalary,
  calculateGiBonus,
  calculateMnpBonus,
  calculateRtkBonusShare,
  calculateSalary,
  calculateSubscriptionBonusShare,
  selectGiBand,
} from './motivationRules';

describe('selectGiBand', () => {
  const base = {
    planRatio: 0.92,
    forecastRatio: 0.9,
    conversionRatio: 1,
    priorityActionsRatio: 0.1,
    videoMonitoringPercent: 90,
  };

  it('selects the reduced band when all extra conditions are met', () => {
    expect(selectGiBand(base)).toBe('below95WithConditions');
  });

  it('falls back to the normal band when the extra conditions fail', () => {
    expect(selectGiBand({ ...base, videoMonitoringPercent: 50 })).toBe('below95');
  });

  it('uses the met-plan grid when the forecast reaches the plan', () => {
    expect(selectGiBand({ ...base, forecastRatio: 1.05 })).toBe('below95WithConditions');
  });

  it('selects the 95–100 % band', () => {
    expect(selectGiBand({ ...base, planRatio: 0.97, forecastRatio: 1.05 })).toBe('from95To100');
  });

  it('selects the 100–110 % band', () => {
    expect(selectGiBand({ ...base, planRatio: 1.05, forecastRatio: 1.05 })).toBe('from100To110');
  });

  it('selects the 110 % and above band', () => {
    expect(selectGiBand({ ...base, planRatio: 1.15, forecastRatio: 1.05 })).toBe('from110');
  });
});

describe('calculateGiBonus', () => {
  const input = {
    planRatio: 1.05,
    forecastRatio: 1.05,
    conversionRatio: 1,
    priorityActionsRatio: 0.1,
    videoMonitoringPercent: 90,
  };

  it('returns the tariff value for the selected band', () => {
    // Black, ФТП выполнено, 100–110 % → 251
    expect(calculateGiBonus('Black', input)).toBe(251);
  });

  it('returns null for a tariff that is not paid', () => {
    expect(calculateGiBonus('Супер онлайн +', input)).toBeNull();
  });

  it('returns null for an unknown tariff', () => {
    expect(calculateGiBonus('Нет такого', input)).toBeNull();
  });

  it('uses the "not met" grid when the FTP forecast is below 1', () => {
    // Мой Онлайн +, ФТП не выполнено, 100–110 % → 178
    expect(calculateGiBonus('Мой Онлайн +', { ...input, forecastRatio: 0.8 })).toBe(178);
  });
});

describe('digital services', () => {
  it('returns 10 % for an RTK plan below 100 %', () => {
    expect(calculateRtkBonusShare(0.9)).toBe(0.1);
  });

  it('returns 13 % for an RTK plan from 100 % to 120 %', () => {
    expect(calculateRtkBonusShare(1.1)).toBe(0.13);
  });

  it('stops paying above 120 %', () => {
    expect(calculateRtkBonusShare(1.3)).toBeNull();
  });

  it('switches the subscription share at 80 %', () => {
    expect(calculateSubscriptionBonusShare(0.8)).toBe(0.2);
    expect(calculateSubscriptionBonusShare(0.79)).toBe(0.1);
  });
});

describe('calculateMnpBonus', () => {
  it('pays 300 ₽ from 100 %', () => {
    expect(calculateMnpBonus(1)).toBe(300);
  });

  it('pays 100 ₽ from 90 % to 100 %', () => {
    expect(calculateMnpBonus(0.95)).toBe(100);
  });

  it('pays 50 ₽ below 90 %', () => {
    expect(calculateMnpBonus(0.5)).toBe(50);
  });
});

describe('calculateSalary', () => {
  it('rounds the daily plan up and splits it between sellers', () => {
    const result = calculateSalary({
      plan: 230_000,
      fact: 566_400,
      workedDays: 20,
      daysInMonth: 31,
      sellerCount: 2,
    });

    // ROUNDUP(230000 / (31 - 20)) = ROUNDUP(20909.09) = 20910
    expect(result.dailyPlan).toBe(20910);
    expect(result.planPerSeller).toBe(10455);
  });

  it('computes the completion ratio', () => {
    const result = calculateSalary({
      plan: 100,
      fact: 50,
      workedDays: 10,
      daysInMonth: 20,
    });
    expect(result.completionRatio).toBeCloseTo(0.5, 5);
  });

  it('computes the forecast from the elapsed days', () => {
    const result = calculateSalary({
      plan: 100,
      fact: 50,
      workedDays: 10,
      daysInMonth: 20,
    });
    expect(result.forecastRatio).toBeCloseTo(1, 5);
  });
});

describe('calculateBaseSalary', () => {
  it('pays the base rate up to the norm', () => {
    expect(calculateBaseSalary(100)).toBe(100 * 104);
  });

  it('pays the overtime rate above the norm', () => {
    expect(calculateBaseSalary(165)).toBe(165 * 104);
    expect(calculateBaseSalary(175)).toBe(165 * 104 + 10 * 120);
  });
});
