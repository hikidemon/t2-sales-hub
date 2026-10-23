/**
 * App-wide static configuration.
 * No secrets here — only values safe for the client bundle.
 */

export const appConfig = {
  /** Product name shown in the UI. */
  appName: 'T2 Sales Hub',
  /**
   * Demo flag. While true the UI must clearly label calculated values
   * as demo data and must not claim integration with official T2 systems.
   */
  isDemo: true,
  /** Base URL for API calls (proxied by Vite in dev). */
  apiBaseUrl: '/api',
} as const;

export type AppConfig = typeof appConfig;
