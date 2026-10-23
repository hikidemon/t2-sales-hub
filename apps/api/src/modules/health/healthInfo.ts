/**
 * Pure builders for the health module. Kept framework-free for easy testing.
 */

export interface HealthInfo {
  status: 'ok';
  /** True while the project runs on demo data only. */
  demo: true;
  /** ISO timestamp of the check. */
  timestamp: string;
}

export function buildHealthInfo(now: Date = new Date()): HealthInfo {
  return {
    status: 'ok',
    demo: true,
    timestamp: now.toISOString(),
  };
}
