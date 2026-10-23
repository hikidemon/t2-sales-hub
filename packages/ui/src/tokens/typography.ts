/**
 * Design tokens for typography.
 *
 * Typeface system taken from the official T2 brand guide:
 *   - Halvar Breitschrift ExtraBold — wide grotesque for headings and slogans;
 *   - Rooftop Regular / Medium — functional grotesque for body copy.
 *
 * Both are licensed brand fonts, so they are referenced by name with a
 * local fallback stack. The app looks correct without them and snaps to
 * the official look when the fonts are installed or licensed.
 *
 * The heading scale follows the guide: H1 clamp(32–60), H2 clamp(22–30),
 * H3 27px, H4 clamp(16–20), body 16px, small 13px.
 */

export const fontFamilyTokens = {
  /**
   * Body typeface — Rooftop. The fallback stack keeps the square-ish
   * grotesque character of the original as closely as the system allows.
   */
  sans: 'var(--font-sans, "T2 Rooftop", "Rooftop", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
  /**
   * Heading typeface — Halvar Breitschrift. ExtraBold only, as the guide
   * specifies; the fallback uses the heaviest available system weight.
   */
  display:
    'var(--font-display, "T2 Halvar Breit", "Halvar Breitschrift", "T2 Halvar Breitschrift", Inter, system-ui, -apple-system, "Segoe UI", sans-serif)',
  mono: 'var(--font-mono, "JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace)',
} as const;

export const fontSizeTokens = {
  '2xs': { size: '0.6875rem', lineHeight: '0.875rem' }, // 11px
  xs: { size: '0.75rem', lineHeight: '1rem' }, // 12px
  sm: { size: '0.8125rem', lineHeight: '1.125rem' }, // 13px — guide: text small
  base: { size: '0.875rem', lineHeight: '1.375rem' }, // 14px
  md: { size: '1rem', lineHeight: '1.5rem' }, // 16px — guide: body
  lg: { size: '1.125rem', lineHeight: '1.75rem' }, // 18px
  xl: { size: '1.25rem', lineHeight: '1.75rem' }, // 20px
  '2xl': { size: '1.5rem', lineHeight: '2rem' }, // 24px
  '3xl': { size: '1.6875rem', lineHeight: '1.875rem' }, // 27px — guide: H3
  '4xl': { size: '2.25rem', lineHeight: '2.375rem' }, // 36px
  '5xl': { size: '3rem', lineHeight: '3.1875rem' }, // 48px
  '6xl': { size: '3.75rem', lineHeight: '3.9375rem' }, // 60px — guide: H1 max
} as const;

export const fontWeightTokens = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  /** Halvar Breitschrift ExtraBold equivalent — the guide's heading weight. */
  extrabold: 800,
} as const;

export const letterSpacingTokens = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

export type FontFamilyTokens = typeof fontFamilyTokens;
export type FontSizeTokens = typeof fontSizeTokens;
export type FontWeightTokens = typeof fontWeightTokens;
export type LetterSpacingTokens = typeof letterSpacingTokens;
