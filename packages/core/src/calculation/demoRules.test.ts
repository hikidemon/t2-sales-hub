import { describe, expect, it } from 'vitest';

import {
  calculateBeatsPercent,
  calculateForecast,
  calculateForecastConfidence,
  calculatePlanPercent,
  calculatePlanRemaining,
} from '../calculation/demoRules';

describe('calculatePlanPercent', () => {
  it('returns the completion percentage with one decimal', () => {
    expect(calculatePlanPercent(148_320, 165_000)).toBe(89.9);
  });

  it('caps the value at 100 when the plan is exceeded', () => {
    expect(calculatePlanPercent(200_000, 165_000)).toBe(100);
  });

  it('never returns a negative value', () => {
    expect(calculatePlanPercent(-5_000, 165_000)).toBe(0);
  });

  it('returns 0 for a non-positive target instead of dividing by zero', () => {
    expect(calculatePlanPercent(10_000, 0)).toBe(0);
  });
});

describe('calculatePlanRemaining', () => {
  it('returns the gap to the target', () => {
    expect(calculatePlanRemaining(148_320, 165_000)).toBe(16_680);
  });

  it('never returns a negative gap', () => {
    expect(calculatePlanRemaining(200_000, 165_000)).toBe(0);
  });
});

describe('calculateForecast', () => {
  it('extrapolates the remaining days with the pacing factor', () => {
    const result = calculateForecast({
      current: 100_000,
      elapsedDays: 20,
      totalDays: 30,
      paceFactor: 0.9,
    });

    // daily average 5000 * 10 remaining days * 0.9 = 45000
    expect(result.dailyAverage).toBe(5_000);
    expect(result.remainingDays).toBe(10);
    expect(result.expectedAdditional).toBe(45_000);
    expect(result.expectedTotal).toBe(145_000);
  });

  it('handles a fully elapsed period', () => {
    const result = calculateForecast({
      current: 120_000,
      elapsedDays: 31,
      totalDays: 31,
    });

    expect(result.remainingDays).toBe(0);
    expect(result.expectedAdditional).toBe(0);
    expect(result.expectedTotal).toBe(120_000);
  });

  it('does not divide by zero when no day has elapsed', () => {
    const result = calculateForecast({ current: 0, elapsedDays: 0, totalDays: 31 });
    expect(result.dailyAverage).toBe(0);
    expect(result.expectedTotal).toBe(0);
  });
});

describe('calculateForecastConfidence', () => {
  it('is high when income runs ahead of time', () => {
    expect(calculateForecastConfidence(90, 100, 20, 31)).toBe('high');
  });

  it('is medium when income keeps pace with time', () => {
    expect(calculateForecastConfidence(64, 100, 20, 31)).toBe('medium');
  });

  it('is low when income lags behind time', () => {
    expect(calculateForecastConfidence(30, 100, 20, 31)).toBe('low');
  });
});

describe('calculateBeatsPercent', () => {
  it('measures the share of outperformed colleagues', () => {
    expect(calculateBeatsPercent(4, 47)).toBe(91.5);
  });

  it('returns 0 for an empty leaderboard', () => {
    expect(calculateBeatsPercent(1, 0)).toBe(0);
  });
});
