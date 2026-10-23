/**
 * Design tokens for transitions and animations.
 */

export const transitionDurationTokens = {
  0: '0ms',
  50: '50ms',
  100: '100ms',
  150: '150ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
  700: '700ms',
  1000: '1000ms',
} as const;

export const transitionTimingFunctionTokens = {
  DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export type TransitionDurationTokens = typeof transitionDurationTokens;
export type TransitionTimingFunctionTokens = typeof transitionTimingFunctionTokens;
