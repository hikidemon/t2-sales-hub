/**
 * Design tokens for shadows.
 *
 * Two families live here:
 *
 * 1. **T2 elevation** — the soft, layered shadows measured on t2.ru:
 *      `rgba(0,0,0,0.06) 0 2px 16px, rgba(0,0,0,0.03) 0 -10px 22px`
 *    A light shadow with a soft upward counter-shadow underneath.
 *
 * 2. **Neo** — flat, hard-edged offset shadows used on accent blocks and
 *    interactive tiles. No blur, a solid offset, no spread.
 *
 * 3. **Glass** — deep, diffuse shadows that read as a lifted translucent
 *    layer rather than a card.
 */

export const shadowTokens = {
  // --- T2 elevation ---
  sm: '0 1px 2px 0 rgb(31 34 41 / 0.05)',
  DEFAULT: '0 2px 16px 0 rgb(31 34 41 / 0.06), 0 -10px 22px 0 rgb(31 34 41 / 0.03)',
  md: '0 2px 16px 0 rgb(31 34 41 / 0.07), 0 -10px 22px 0 rgb(31 34 41 / 0.03)',
  lg: '0 8px 30px 0 rgb(31 34 41 / 0.1), 0 0 7px 0 rgb(31 34 41 / 0.06)',
  xl: '0 16px 40px 0 rgb(31 34 41 / 0.12)',
  '2xl': '0 25px 50px -12px rgb(31 34 41 / 0.16)',
  inner: 'inset 0 2px 4px 0 rgb(31 34 41 / 0.04)',

  // --- Neo: hard offset, no blur ---
  neo: '4px 4px 0 0 rgb(31 34 41 / 1)',
  'neo-brand': '4px 4px 0 0 rgb(255 52 149 / 1)',
  'neo-lime': '4px 4px 0 0 rgb(167 252 0 / 1)',
  'neo-sm': '3px 3px 0 0 rgb(31 34 41 / 1)',
  'neo-lg': '6px 6px 0 0 rgb(31 34 41 / 1)',
  'neo-inset': 'inset 3px 3px 0 0 rgb(31 34 41 / 0.12)',

  // --- Glass ---
  glass: '0 8px 32px 0 rgb(31 34 41 / 0.12), 0 2px 8px 0 rgb(31 34 41 / 0.06)',
  'glass-sm': '0 4px 16px 0 rgb(31 34 41 / 0.08), 0 1px 4px 0 rgb(31 34 41 / 0.04)',
  'glass-lg': '0 20px 48px 0 rgb(31 34 41 / 0.16), 0 4px 12px 0 rgb(31 34 41 / 0.06)',
  /** Inset highlight that gives a glass surface its top-edge sheen. */
  'glass-inset': 'inset 0 1px 0 0 rgb(255 255 255 / 0.9), inset 0 -1px 0 0 rgb(31 34 41 / 0.04)',
} as const;

export type ShadowTokens = typeof shadowTokens;
