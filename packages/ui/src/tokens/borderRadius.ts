/**
 * Design tokens for border radius.
 */

export const borderRadiusTokens = {
  none: '0',
  sm: '0.25rem', // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
  xl: '1.5rem', // 24px
  '2xl': '2rem', // 32px
  full: '9999px',
} as const;

export type BorderRadiusTokens = typeof borderRadiusTokens;
