/**
 * Motivation rules extracted from the source workbooks.
 *
 * These are the rules published in
 * `НР_ Обновленная мотивация Т2 15.10.2026.xlsx` (from 15.10.2026) and in
 * the formulas of the `ЗП` sheet of a trading point.
 *
 * IMPORTANT: they are transcribed from the supplied spreadsheets. They are
 * NOT an official T2 API — the source of every value is noted next to it.
 * Anything that could not be confirmed is listed in
 * `docs/data/MOTIVATION_RULES.md` as an open question.
 */

/** Normal working time per month, in hours (21 shifts). */
export const MONTHLY_HOURS_NORM = 165;

/** Base hourly rate, rubles per hour. */
export const HOURLY_RATE = 104;

/** Overtime hourly rate, rubles per hour. */
export const OVERTIME_HOURLY_RATE = 120;

/** Downward coefficient applied when the GI plan is below 100 %. */
export const GI_PLAN_PENALTY_COEFFICIENT = 0.95;

/** Downward coefficient for the credit-application special case. */
export const CREDIT_APPLICATION_PENALTY_COEFFICIENT = 0.95;

/** Share of Priority Actions required for the reduced GI tariff. */
export const PRIORITY_ACTIONS_MIN_SHARE = 0.07;

/** Video-monitoring threshold required for the reduced GI tariff. */
export const VIDEO_MONITORING_MIN_PERCENT = 80;

/** Minimum conversion plan execution required for the reduced GI tariff. */
export const CONVERSION_PLAN_MIN = 1;

/**
 * GI tariff grid.
 *
 * Rows: tariff name. Columns: plan-execution band.
 * The grid is duplicated for two states — "ФТП не выполнено" and
 * "ФТП выполнено" — plus a special column for the case when the plan is
 * below 95 % but the point still meets the conversion / VMR / Priority
 * Actions conditions.
 *
 * Source: sheet `Мотивация с 15.10.2026`, rows 18–40, columns B–L.
 */
export interface GiTariffRow {
  /** Tariff name, as written in the source table. */
  tariff: string;
  /** «АП» value, rubles. */
  advancePayment: number | null;
  /** Tariff when the FTP plan is not met. */
  ftpNotMet: {
    below95: number | null;
    below95WithConditions: number | null;
    from95To100: number | null;
    from100To110: number | null;
    from110: number | null;
  };
  /** Tariff when the FTP plan is met. */
  ftpMet: {
    below95: number | null;
    below95WithConditions: number | null;
    from95To100: number | null;
    from100To110: number | null;
    from110: number | null;
  };
}

export const GI_TARIFFS: GiTariffRow[] = [
  {
    tariff: 'Мой разговор',
    advancePayment: 550,
    ftpNotMet: {
      below95: 29,
      below95WithConditions: 44,
      from95To100: 58,
      from100To110: 87,
      from110: 116,
    },
    ftpMet: {
      below95: 29,
      below95WithConditions: 44,
      from95To100: 58,
      from100To110: 87,
      from110: 116,
    },
  },
  {
    tariff: 'Мой Онлайн',
    advancePayment: 650,
    ftpNotMet: {
      below95: 34,
      below95WithConditions: 86,
      from95To100: 103,
      from100To110: 154,
      from110: 189,
    },
    ftpMet: {
      below95: 34,
      below95WithConditions: 86,
      from95To100: 103,
      from100To110: 154,
      from110: 189,
    },
  },
  {
    tariff: 'Мой Онлайн +',
    advancePayment: 750,
    ftpNotMet: {
      below95: 40,
      below95WithConditions: 99,
      from95To100: 119,
      from100To110: 178,
      from110: 218,
    },
    ftpMet: {
      below95: 40,
      below95WithConditions: 119,
      from95To100: 139,
      from100To110: 198,
      from110: 238,
    },
  },
  {
    tariff: 'Black',
    advancePayment: 950,
    ftpNotMet: {
      below95: 50,
      below95WithConditions: 125,
      from95To100: 150,
      from100To110: 226,
      from110: 276,
    },
    ftpMet: {
      below95: 50,
      below95WithConditions: 150,
      from95To100: 176,
      from100To110: 251,
      from110: 301,
    },
  },
  {
    tariff: 'ИДУ',
    advancePayment: 900,
    ftpNotMet: {
      below95: 48,
      below95WithConditions: 71,
      from95To100: 95,
      from100To110: 143,
      from110: 190,
    },
    ftpMet: {
      below95: 48,
      below95WithConditions: 71,
      from95To100: 95,
      from100To110: 143,
      from110: 190,
    },
  },
  {
    tariff: 'Premium',
    advancePayment: 1500,
    ftpNotMet: {
      below95: 79,
      below95WithConditions: 119,
      from95To100: 158,
      from100To110: 238,
      from110: 317,
    },
    ftpMet: {
      below95: 79,
      below95WithConditions: 158,
      from95To100: 198,
      from100To110: 277,
      from110: 356,
    },
  },
  {
    tariff: 'Игровой',
    advancePayment: 890,
    ftpNotMet: {
      below95: 47,
      below95WithConditions: 70,
      from95To100: 94,
      from100To110: 141,
      from110: 188,
    },
    ftpMet: {
      below95: 47,
      below95WithConditions: 70,
      from95To100: 94,
      from100To110: 141,
      from110: 188,
    },
  },
  {
    tariff: 'Везде онлайн',
    advancePayment: 650,
    ftpNotMet: {
      below95: 34,
      below95WithConditions: 51,
      from95To100: 69,
      from100To110: 103,
      from110: 137,
    },
    ftpMet: {
      below95: 34,
      below95WithConditions: 69,
      from95To100: 86,
      from100To110: 120,
      from110: 154,
    },
  },
  {
    tariff: 'Хватит',
    advancePayment: 900,
    ftpNotMet: {
      below95: 48,
      below95WithConditions: 71,
      from95To100: 95,
      from100To110: 143,
      from110: 190,
    },
    ftpMet: {
      below95: 48,
      below95WithConditions: 95,
      from95To100: 119,
      from100To110: 166,
      from110: 214,
    },
  },
  {
    tariff: 'Мой Онлайн + Комбо 3 мес',
    advancePayment: 2250,
    ftpNotMet: {
      below95: 119,
      below95WithConditions: 297,
      from95To100: 356,
      from100To110: 475,
      from110: 594,
    },
    ftpMet: {
      below95: 119,
      below95WithConditions: 356,
      from95To100: 416,
      from100To110: 535,
      from110: 653,
    },
  },
  {
    tariff: 'Мой Онлайн + Комбо 12 мес',
    advancePayment: 9000,
    ftpNotMet: {
      below95: 475,
      below95WithConditions: 1188,
      from95To100: 1426,
      from100To110: 2138,
      from110: 2614,
    },
    ftpMet: {
      below95: 475,
      below95WithConditions: 1426,
      from95To100: 1663,
      from100To110: 2376,
      from110: 2851,
    },
  },
];

/** Tariffs that are not paid at all. */
export const GI_TARIFFS_NOT_PAID = ['Супер онлайн +'];

/** Which GI tariff band applies. */
export type GiBand =
  'below95' | 'below95WithConditions' | 'from95To100' | 'from100To110' | 'from110';

export interface GiTariffInput {
  /** Plan execution ratio, e.g. 0.92 for 92 %. */
  planRatio: number;
  /** Forecast of the plan at the end of the period, e.g. 1.05. */
  forecastRatio: number;
  /** Conversion plan execution ratio — must be >= 1 for the reduced tariff. */
  conversionRatio: number;
  /** Priority Actions share — plan/fact ratio; must be >= 7 %. */
  priorityActionsRatio: number;
  /** Video monitoring result, percent. */
  videoMonitoringPercent: number;
}

/**
 * Selects the GI tariff band.
 *
 * Mirrors the branching of the source formula:
 * `IF('ЗП'!$Z$11<1, IF('ЗП'!$V$11<0.95, IF(AND(...), <reduced>, <normal>), ...), ...)`
 *
 * Source: formula in column B of sheet `Лист_продаж`.
 */
export function selectGiBand(input: GiTariffInput): GiBand {
  const meetsReducedConditions =
    input.conversionRatio >= CONVERSION_PLAN_MIN &&
    input.priorityActionsRatio >= PRIORITY_ACTIONS_MIN_SHARE &&
    input.videoMonitoringPercent >= VIDEO_MONITORING_MIN_PERCENT;

  if (input.forecastRatio < 1) {
    // FTP plan is not met
    if (input.planRatio < 0.95) {
      return meetsReducedConditions ? 'below95WithConditions' : 'below95';
    }
    if (input.planRatio < 1) return 'from95To100';
    if (input.planRatio < 1.1) return 'from100To110';
    return 'from110';
  }

  // FTP plan is met
  if (input.planRatio < 0.95) {
    return meetsReducedConditions ? 'below95WithConditions' : 'below95';
  }
  if (input.planRatio < 1) return 'from95To100';
  if (input.planRatio < 1.1) return 'from100To110';
  return 'from110';
}

/**
 * Returns the GI bonus for a tariff, or null when the tariff is not paid.
 * Source: sheet `Мотивация с 15.10.2026`, rows 21–40.
 */
export function calculateGiBonus(tariff: string, input: GiTariffInput): number | null {
  if (GI_TARIFFS_NOT_PAID.includes(tariff)) return null;

  const row = GI_TARIFFS.find((item) => item.tariff === tariff);
  if (!row) return null;

  const band = selectGiBand(input);
  const grid = input.forecastRatio < 1 ? row.ftpNotMet : row.ftpMet;
  return grid[band];
}

/** Digital services: share of AО РТК sales paid as a bonus. */
export const DIGITAL_SERVICES = {
  /** Equipment RTK: plan below 100 %. */
  rtkBelow100: 0.1,
  /** Equipment RTK: plan from 100 % to 120 %. */
  rtkFrom100To120: 0.13,
  /** Equipment RTK: above 120 % nothing is paid (stop plan). */
  rtkAbove120: null,
  /** Subscription services: plan at or above 80 %. */
  subscriptionsAtOrAbove80: 0.2,
  /** Subscription services: plan below 80 %. */
  subscriptionsBelow80: 0.1,
  /** PRO32 antivirus: plan at or above 80 %. */
  pro32AtOrAbove80: 0.3,
  /** PRO32 antivirus: plan below 80 %. */
  pro32Below80: 0.15,
} as const;

/** Returns the RTK equipment bonus share for a plan-execution ratio. */
export function calculateRtkBonusShare(planRatio: number): number | null {
  if (planRatio < 1) return DIGITAL_SERVICES.rtkBelow100;
  if (planRatio <= 1.2) return DIGITAL_SERVICES.rtkFrom100To120;
  return DIGITAL_SERVICES.rtkAbove120;
}

/** Returns the subscription-services bonus share for a plan-execution ratio. */
export function calculateSubscriptionBonusShare(planRatio: number): number {
  return planRatio >= 0.8
    ? DIGITAL_SERVICES.subscriptionsAtOrAbove80
    : DIGITAL_SERVICES.subscriptionsBelow80;
}

/** Fixed services: bonus per connection, rubles. */
export const FIXED_SERVICES = {
  /** ШПД РТК — plan at or above 90 %. */
  shpdRtkAtOrAbove90: 1000,
  /** ШПД РТК — plan below 90 %. */
  shpdRtkBelow90: 400,
  /** ТВ РТК — plan at or above 90 %. */
  tvRtkAtOrAbove90: 1000,
  /** ТВ РТК — plan below 90 %. */
  tvRtkBelow90: 400,
} as const;

/** Insurance (Top UP) bonus share, rubles percent of the insured amount. */
export const INSURANCE_TARIFFS = {
  /** Plan of smartphones above 80 % — insurance plan below 80 %. */
  smartphonesAbove80_insuranceBelow80: 0.05,
  smartphonesAbove80_insurance80to120: 0.2,
  smartphonesAbove80_insurance120to140: 0.25,
  smartphonesAbove80_insurance140to150: 0.35,
  smartphonesAbove80_insuranceFrom150: 0.45,
  smartphonesBelow80_insuranceBelow80: 0.05,
  smartphonesBelow80_insurance80to120: 0.12,
  smartphonesBelow80_insurance120to140: 0.17,
  smartphonesBelow80_insuranceFrom140: 0.2,
  smartphonesBelow80_insuranceFrom150: 0.25,
} as const;

/** Equipment base bonus share by plan-execution band. */
export const EQUIPMENT_BASE_SHARE = {
  below80: 0.01,
  from80to110: 0.02,
  from110: 0.03,
} as const;

/** Accessories bonus share by plan-execution band. */
export const ACCESSORIES_SHARE = {
  below100: 0.1,
  from100to140: 0.13,
  from140: 0.17,
} as const;

/** MNP bonus by plan execution, rubles. */
export const MNP_BONUS = {
  atOrAbove100: 300,
  from90to100: 100,
  below90: 50,
} as const;

/** Returns the MNP bonus for a plan-execution ratio. */
export function calculateMnpBonus(planRatio: number): number {
  if (planRatio >= 1) return MNP_BONUS.atOrAbove100;
  if (planRatio >= 0.9) return MNP_BONUS.from90to100;
  return MNP_BONUS.below90;
}

/** Video monitoring (ВМР) bonus per questionnaire, rubles. */
export const VMR_BONUS = {
  atOrAbove101: 2000,
  from80to100: 1500,
  from77to80: 0,
  below77: -2000,
} as const;

/** Internal VMR bonus from 25.03.2026, rubles. */
export const INTERNAL_VMR_BONUS = {
  atOrAbove80: 300,
  below80: -400,
} as const;

/** Credit bonus per issued credit, rubles. */
export const CREDIT_BONUS = {
  atOrAbove120: 800,
  from100to120: 500,
  below100: 200,
} as const;

/** Yandex Split share of turnover. */
export const YANDEX_SPLIT_SHARE = {
  withSplit: 0.02,
  withoutSplit: 0.01,
} as const;

/** Educator (наставник) bonus, rubles. */
export const EDUCATOR_BONUS = {
  traineeApproved: 300,
  reportingKept: 500,
  firstCheckpoint: 400,
  secondCheckpoint: 400,
  attestationInT2: 600,
  internalAttestation: 800,
  totalPerTrainee: 3000,
} as const;

/**
 * Downward coefficients applied to the whole bonus.
 * Source: sheet `Мотивация с 15.10.2026`, rows 138–143.
 */
export const PENALTY_COEFFICIENTS = {
  /** Photo report below 74.99 % — the whole bonus is reduced by 10 %. */
  photoReportBelow75: 0.9,
  /** Refusal to sell in a promotion — the whole bonus is reduced by 5 %. */
  saleRefusal: 0.95,
  /** GI plan below 95 % — the premium part is reduced by 5 %. */
  giPlanBelow95: 0.95,
} as const;

/**
 * Computes the salary for a month from the source table's model.
 *
 * Mirrors the `ЗП` sheet:
 *   - daily plan   = ROUNDUP(plan / (daysInMonth - workedDays), 0)
 *   - plan per seller = daily plan / 2
 *   - forecast     = (fact / workedDays * daysInMonth) / plan
 *   - completion   = fact / plan
 *
 * Source: sheet `ЗП`, rows 6, 7, 10, 11.
 */
export interface SalaryCalculationInput {
  /** Monthly plan for the indicator, rubles. */
  plan: number;
  /** Actual value for the elapsed part of the month. */
  fact: number;
  /** Days already elapsed. */
  workedDays: number;
  /** Total days in the month. */
  daysInMonth: number;
  /** Number of sellers the plan is split between. */
  sellerCount?: number;
}

export interface SalaryCalculation {
  dailyPlan: number;
  planPerSeller: number;
  forecastRatio: number;
  completionRatio: number;
  missingToPlan: number;
}

export function calculateSalary(input: SalaryCalculationInput): SalaryCalculation {
  const { plan, fact, workedDays, daysInMonth } = input;
  const sellerCount = input.sellerCount && input.sellerCount > 0 ? input.sellerCount : 1;
  const remainingDays = Math.max(daysInMonth - workedDays, 0);

  const dailyPlan = remainingDays > 0 ? Math.ceil(plan / remainingDays) : plan;
  const planPerSeller = dailyPlan / sellerCount;
  const forecastRatio = plan > 0 ? ((fact / workedDays) * daysInMonth) / plan : 0;

  return {
    dailyPlan,
    planPerSeller,
    forecastRatio,
    completionRatio: plan > 0 ? fact / plan : 0,
    missingToPlan: plan - fact,
  };
}

/**
 * Computes the base salary part from worked hours.
 * Source: sheet `Мотивация с 15.10.2026`, rows 13–16.
 */
export function calculateBaseSalary(workedHours: number): number {
  if (workedHours <= MONTHLY_HOURS_NORM) {
    return workedHours * HOURLY_RATE;
  }
  const norm = MONTHLY_HOURS_NORM * HOURLY_RATE;
  const overtime = (workedHours - MONTHLY_HOURS_NORM) * OVERTIME_HOURLY_RATE;
  return norm + overtime;
}
