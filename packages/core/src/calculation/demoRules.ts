/**
 * Demo calculation rules.
 *
 * NONE of these are official T2 formulas. They are simplified,
 * explicitly documented demo rules used to make the synthetic dataset
 * internally consistent. The UI must label the results as demo values.
 */

/**
 * Plan completion percentage.
 * Demo rule: current / target * 100, rounded to one decimal,
 * clamped to the [0, 100] range for display purposes.
 */
export function calculatePlanPercent(current: number, target: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }
  const raw = (current / target) * 100;
  return Math.round(Math.min(Math.max(raw, 0), 100) * 10) / 10;
}

/** Remaining amount to reach the plan, never negative. */
export function calculatePlanRemaining(current: number, target: number): number {
  return Math.max(target - current, 0);
}

export interface ForecastInput {
  /** Income already earned in the period. */
  current: number;
  /** Days already elapsed. */
  elapsedDays: number;
  /** Total length of the period in days. */
  totalDays: number;
  /**
   * Demo pacing factor applied to the naive linear extrapolation.
   * 1 = full linear pace, <1 = slower pace.
   */
  paceFactor?: number;
}

export interface ForecastResult {
  expectedAdditional: number;
  expectedTotal: number;
  /** Average income per elapsed day. */
  dailyAverage: number;
  remainingDays: number;
}

/**
 * Demo forecast rule (linear extrapolation with a pacing factor).
 *
 * dailyAverage   = current / elapsedDays
 * remainingDays  = totalDays - elapsedDays
 * expectedAdd    = dailyAverage * remainingDays * paceFactor
 * expectedTotal  = current + expectedAdd
 *
 * The pacing factor models a slowing sales pace towards the end of
 * a month. It is a demo assumption, not a T2 business rule.
 */
export function calculateForecast({
  current,
  elapsedDays,
  totalDays,
  paceFactor = 0.9,
}: ForecastInput): ForecastResult {
  const remainingDays = Math.max(totalDays - elapsedDays, 0);
  const dailyAverage = elapsedDays > 0 ? current / elapsedDays : 0;
  const expectedAdditional = Math.round(dailyAverage * remainingDays * paceFactor);
  return {
    expectedAdditional,
    expectedTotal: current + expectedAdditional,
    dailyAverage,
    remainingDays,
  };
}

/**
 * Forecast confidence in the demo model.
 * Demo rule: compare income progress with time progress.
 *  - income ahead of time  -> high
 *  - roughly in line      -> medium
 *  - behind               -> low
 */
export function calculateForecastConfidence(
  current: number,
  target: number,
  elapsedDays: number,
  totalDays: number
): 'low' | 'medium' | 'high' {
  if (target <= 0 || totalDays <= 0) {
    return 'low';
  }
  const incomeProgress = current / target;
  const timeProgress = elapsedDays / totalDays;
  const difference = incomeProgress - timeProgress;
  if (difference >= 0.1) return 'high';
  if (difference >= -0.1) return 'medium';
  return 'low';
}

/**
 * Share of colleagues the seller outperforms, in percent.
 * Demo rule: (total - position) / total * 100, rounded to one decimal.
 */
export function calculateBeatsPercent(position: number, total: number): number {
  if (total <= 0) return 0;
  const raw = ((total - position) / total) * 100;
  return Math.round(Math.min(Math.max(raw, 0), 100) * 10) / 10;
}
