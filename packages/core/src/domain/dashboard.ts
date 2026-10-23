/**
 * Domain models for the seller dashboard.
 *
 * Framework-independent: no React, no UI, no transport specifics.
 * All amounts are stored in whole rubles.
 */

export type PeriodId = string;

/** Reporting period (a month in the demo dataset). */
export interface Period {
  id: PeriodId;
  /** Human readable label, e.g. «Октябрь 2026». */
  label: string;
  /** Short label for compact UI, e.g. «окт. 2026». */
  shortLabel: string;
  /** ISO date of the first day of the period. */
  startDate: string;
  /** Total number of days in the period. */
  totalDays: number;
  /** Number of days already elapsed at the moment of the snapshot. */
  elapsedDays: number;
}

/** The seller (employee) the dashboard belongs to. */
export interface Seller {
  id: string;
  name: string;
  position: string;
  region: string;
  /** Two-letter initials used as an avatar fallback. */
  initials: string;
}

export type BonusStatus = 'earned' | 'pending';

/** A single bonus that is part of the income breakdown. */
export interface BonusItem {
  id: string;
  title: string;
  amount: number;
  status: BonusStatus;
  /** Short explanation of the demo rule that produced this bonus. */
  basis: string;
}

/** Income breakdown for the period. */
export interface IncomeSummary {
  /** Base / salary-like part of the income. */
  base: number;
  /** All bonus lines (earned and pending). */
  bonuses: BonusItem[];
  /** Earned bonuses only. */
  earnedBonusTotal: number;
  /** Pending (not yet granted) bonuses only. */
  pendingBonusTotal: number;
  /** base + earnedBonusTotal — the headline income figure. */
  total: number;
}

/** Progress against the sales plan. */
export interface PlanProgress {
  current: number;
  target: number;
  /** current / target as a percentage, rounded to one decimal. */
  percent: number;
  /** target - current, clamped at 0. */
  remaining: number;
}

export type KpiUnit = 'currency' | 'percent' | 'number';

/**
 * A neutral demo indicator. These are NOT official T2 KPIs —
 * they are placeholders with clearly synthetic values.
 */
export interface Kpi {
  id: string;
  label: string;
  value: number;
  unit: KpiUnit;
  /** Change versus the previous period, in percent. */
  delta?: number;
  hint: string;
}

/** A single point of a dynamics series. */
export interface MetricPoint {
  label: string;
  value: number;
}

/** Dynamics of one metric across several points. */
export interface MetricDynamics {
  id: string;
  title: string;
  unit: KpiUnit;
  points: MetricPoint[];
}

/** One row of the general sales ranking. */
export interface RankingEntry {
  position: number;
  /** Demo display name. */
  sellerName: string;
  amount: number;
  isCurrentSeller?: boolean;
}

/** The seller's position in the general ranking. */
export interface RankingPosition {
  position: number;
  total: number;
  /** Share of colleagues the seller outperforms, in percent. */
  beatsPercent: number;
  /** Top rows of the leaderboard. */
  top: RankingEntry[];
}

/** Demo forecast of the period result. */
export interface Forecast {
  /** Expected total income at the end of the period. */
  expectedTotal: number;
  /** Expected additional income from the remaining days. */
  expectedAdditional: number;
  /** Which demo rule produced the numbers. */
  basis: string;
  confidence: 'low' | 'medium' | 'high';
}

export type OperationType = 'sale' | 'bonus' | 'correction';

/** A recent operation shown in the activity feed. */
export interface SalesOperation {
  id: string;
  title: string;
  amount: number;
  /** ISO date. */
  date: string;
  type: OperationType;
}

/** Everything the dashboard page needs. */
export interface DashboardData {
  period: Period;
  seller: Seller;
  income: IncomeSummary;
  plan: PlanProgress;
  kpis: Kpi[];
  dynamics: MetricDynamics[];
  ranking: RankingPosition;
  forecast: Forecast;
  recentOperations: SalesOperation[];
}
