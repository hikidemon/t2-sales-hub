/**
 * Design tokens for colors.
 *
 * The palette is taken from the official T2 brand guide (brand.t2.ru),
 * verified against the live site by extracting computed styles:
 *
 *   - Primary palette: black, white, magenta (T2 calls it «маджента»)
 *   - Additional palette: lime, electric blue, blue
 *   - Dominant text colour on the live site: rgb(31, 34, 41) = #1F2229
 *   - Muted text: rgb(107, 113, 127) = #6B717F
 *
 * Brand rules from the guide that this file encodes:
 *   - primary colours cover 90–100 % of any surface;
 *   - magenta is an accent, never a large fill, and never a text colour;
 *   - an additional colour is used on at most 20 % of a layout.
 *
 * These are raw values that map to CSS custom properties and Tailwind config.
 * Do not use them directly in components — use Tailwind classes or CSS variables.
 */

export const colorTokens = {
  /**
   * Brand magenta — the primary T2 accent.
   * #FF3495 is the exact value used on t2.ru and in the brand guide.
   */
  brand: {
    50: '#fff0f7',
    100: '#ffe0ef',
    200: '#ffc2de',
    300: '#ff96c4',
    400: '#ff5caa',
    500: '#ff3495', // Primary brand magenta (verified on t2.ru)
    600: '#f01b80',
    700: '#c70f68',
    800: '#9d0b52',
    900: '#7a0942',
    950: '#4a0427',
  },

  /**
   * Lime — the T2 secondary accent used for button fills and icon tiles.
   * #A7FC00 is the exact value used on t2.ru.
   */
  lime: {
    50: '#f7ffe6',
    100: '#edffc2',
    200: '#e0ff91',
    300: '#d4ff60',
    400: '#bdff2b',
    500: '#a7fc00', // Verified on t2.ru
    600: '#8fd000',
    700: '#6f9e00',
    800: '#557800',
    900: '#416000',
    950: '#233300',
  },

  /**
   * Electric blue — the T2 third accent, used where magenta is impossible
   * or already present in the layout.
   */
  electric: {
    50: '#e6f9ff',
    100: '#b3f0ff',
    200: '#80e5ff',
    300: '#4dd9ff',
    400: '#1ecfff',
    500: '#00bfff', // Electric blue (verified on t2.ru)
    600: '#009fd6',
    700: '#007fa8',
    800: '#00617f',
    900: '#00455a',
    950: '#002633',
  },

  /**
   * Ink — the neutral scale. T2 uses true black and a near-black text
   * colour (#1F2229) rather than the blue-grey of a default Tailwind scale.
   */
  ink: {
    50: '#f5f5f7', // Verified on t2.ru
    100: '#ebebee',
    200: '#d6d8de',
    300: '#b4b8c2',
    400: '#8b909c',
    500: '#6b717f', // Muted text (verified on t2.ru)
    600: '#4f5461',
    700: '#3a3e48',
    800: '#282b33',
    900: '#1f2229', // Primary text (verified on t2.ru)
    950: '#0d0e12',
  },

  // Surface scale for dark theme
  surface: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },

  // Semantic background colors
  background: {
    primary: 'var(--color-background-primary, #f5f5f7)',
    secondary: 'var(--color-background-secondary, #ffffff)',
    tertiary: 'var(--color-background-tertiary, #ebebee)',
    card: 'var(--color-background-card, #ffffff)',
    cardHover: 'var(--color-background-card-hover, #f5f5f7)',
  },

  // Semantic text colors
  text: {
    primary: 'var(--color-text-primary, #1f2229)',
    secondary: 'var(--color-text-secondary, #4f5461)',
    tertiary: 'var(--color-text-tertiary, #6b717f)',
    muted: 'var(--color-text-muted, #8b909c)',
    inverse: 'var(--color-text-inverse, #ffffff)',
    onBrand: 'var(--color-text-on-brand, #ffffff)',
  },

  // Border colors
  border: {
    primary: 'var(--color-border-primary, #d6d8de)',
    secondary: 'var(--color-border-secondary, #ebebee)',
    accent: 'var(--color-border-accent, #ff3495)',
    focus: 'var(--color-border-focus, #ff3495)',
  },

  // State colors
  state: {
    success: {
      light: '#22c55e',
      DEFAULT: '#16a34a',
      dark: '#15803d',
      bg: '#14532d',
      border: '#166534',
    },
    warning: {
      light: '#f59e0b',
      DEFAULT: '#d97706',
      dark: '#b45309',
      bg: '#78350f',
      border: '#92400e',
    },
    danger: {
      light: '#ef4444',
      DEFAULT: '#dc2626',
      dark: '#b91c1c',
      bg: '#7f1d1d',
      border: '#991b1b',
    },
    info: {
      light: '#3b82f6',
      DEFAULT: '#2563eb',
      dark: '#1d4ed8',
      bg: '#1e3a5f',
      border: '#1e40af',
    },
  },

  /**
   * Overlay and glass colours.
   * The glass tints are tuned for a light background: a white translucent
   * layer over a blurred backdrop, with a border that keeps the edge
   * readable against any content behind it.
   */
  overlay: {
    light: 'rgba(255, 255, 255, 0.05)',
    DEFAULT: 'rgba(31, 34, 41, 0.4)',
    heavy: 'rgba(31, 34, 41, 0.7)',
    glass: 'rgba(255, 255, 255, 0.62)',
    glassStrong: 'rgba(255, 255, 255, 0.82)',
    glassBorder: 'rgba(31, 34, 41, 0.08)',
    glassHighlight: 'rgba(255, 255, 255, 0.9)',
  },
} as const;

export type ColorTokens = typeof colorTokens;
