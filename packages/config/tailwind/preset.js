/**
 * Shared Tailwind preset for all apps.
 *
 * Semantic colors (background/text/border/status) are defined via
 * CSS custom properties stored as "R G B" channels, so Tailwind's
 * opacity modifiers (e.g. `bg-background-card/80`) work correctly.
 * The variables themselves are declared in `@t2-sales-hub/ui/styles.css`
 * (`:root` = light theme by default, `[data-theme='dark']` for dark mode).
 *
 * The brand palettes below mirror the official T2 brand guide
 * (brand.t2.ru) — see `packages/ui/src/tokens/colors.ts` for the
 * verified hex values and the rules they encode.
 *
 * NOTE: `content` is intentionally NOT set here — each app declares its own
 * content globs in its tailwind.config.js (paths are resolved relative to
 * the app root).
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  darkMode: 'class',
  theme: {
    screens: {
      xs: '320px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Primary T2 accent — magenta #FF3495
        brand: {
          50: '#fff0f7',
          100: '#ffe0ef',
          200: '#ffc2de',
          300: '#ff96c4',
          400: '#ff5caa',
          500: '#ff3495',
          600: '#f01b80',
          700: '#c70f68',
          800: '#9d0b52',
          900: '#7a0942',
          950: '#4a0427',
        },
        // T2 additional accent — lime #A7FC00
        lime: {
          50: '#f7ffe6',
          100: '#edffc2',
          200: '#e0ff91',
          300: '#d4ff60',
          400: '#bdff2b',
          500: '#a7fc00',
          600: '#8fd000',
          700: '#6f9e00',
          800: '#557800',
          900: '#416000',
          950: '#233300',
        },
        // T2 additional accent — electric blue #00BFFF
        electric: {
          50: '#e6f9ff',
          100: '#b3f0ff',
          200: '#80e5ff',
          300: '#4dd9ff',
          400: '#1ecfff',
          500: '#00bfff',
          600: '#009fd6',
          700: '#007fa8',
          800: '#00617f',
          900: '#00455a',
          950: '#002633',
        },
        // Neutral ink scale — T2 text #1F2229, muted #6B717F
        ink: {
          50: '#f5f5f7',
          100: '#ebebee',
          200: '#d6d8de',
          300: '#b4b8c2',
          400: '#8b909c',
          500: '#6b717f',
          600: '#4f5461',
          700: '#3a3e48',
          800: '#282b33',
          900: '#1f2229',
          950: '#0d0e12',
        },
        // Legacy surface scale, kept for existing utilities
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
        background: {
          primary: 'rgb(var(--color-background-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-background-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--color-background-tertiary) / <alpha-value>)',
          card: 'rgb(var(--color-background-card) / <alpha-value>)',
          'card-hover': 'rgb(var(--color-background-card-hover) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--color-text-tertiary) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
          inverse: 'rgb(var(--color-text-inverse) / <alpha-value>)',
          'on-brand': 'rgb(var(--color-text-on-brand) / <alpha-value>)',
        },
        border: {
          primary: 'rgb(var(--color-border-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-border-secondary) / <alpha-value>)',
          accent: 'rgb(var(--color-border-accent) / <alpha-value>)',
          focus: 'rgb(var(--color-border-focus) / <alpha-value>)',
        },
        success: {
          400: 'rgb(var(--color-success-400) / <alpha-value>)',
          500: 'rgb(var(--color-success-500) / <alpha-value>)',
          600: 'rgb(var(--color-success-600) / <alpha-value>)',
          bg: 'rgb(var(--color-success-bg) / <alpha-value>)',
          border: 'rgb(var(--color-success-border) / <alpha-value>)',
        },
        warning: {
          400: 'rgb(var(--color-warning-400) / <alpha-value>)',
          500: 'rgb(var(--color-warning-500) / <alpha-value>)',
          600: 'rgb(var(--color-warning-600) / <alpha-value>)',
          bg: 'rgb(var(--color-warning-bg) / <alpha-value>)',
          border: 'rgb(var(--color-warning-border) / <alpha-value>)',
        },
        danger: {
          400: 'rgb(var(--color-danger-400) / <alpha-value>)',
          500: 'rgb(var(--color-danger-500) / <alpha-value>)',
          600: 'rgb(var(--color-danger-600) / <alpha-value>)',
          700: 'rgb(var(--color-danger-700) / <alpha-value>)',
          bg: 'rgb(var(--color-danger-bg) / <alpha-value>)',
          border: 'rgb(var(--color-danger-border) / <alpha-value>)',
        },
        info: {
          400: 'rgb(var(--color-info-400) / <alpha-value>)',
          500: 'rgb(var(--color-info-500) / <alpha-value>)',
          600: 'rgb(var(--color-info-600) / <alpha-value>)',
          bg: 'rgb(var(--color-info-bg) / <alpha-value>)',
          border: 'rgb(var(--color-info-border) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          'T2 Rooftop',
          'Rooftop',
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: [
          'T2 Halvar Breit',
          'Halvar Breitschrift',
          'T2 Halvar Breitschrift',
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.875rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.125rem' }],
        base: ['0.875rem', { lineHeight: '1.375rem' }],
        md: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.6875rem', { lineHeight: '1.875rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.375rem' }],
        '5xl': ['3rem', { lineHeight: '3.1875rem' }],
        '6xl': ['3.75rem', { lineHeight: '3.9375rem' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        bento: '1rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(31 34 41 / 0.05)',
        DEFAULT: '0 2px 16px 0 rgb(31 34 41 / 0.06), 0 -10px 22px 0 rgb(31 34 41 / 0.03)',
        md: '0 2px 16px 0 rgb(31 34 41 / 0.07), 0 -10px 22px 0 rgb(31 34 41 / 0.03)',
        lg: '0 8px 30px 0 rgb(31 34 41 / 0.1), 0 0 7px 0 rgb(31 34 41 / 0.06)',
        xl: '0 16px 40px 0 rgb(31 34 41 / 0.12)',
        '2xl': '0 25px 50px -12px rgb(31 34 41 / 0.16)',
        inner: 'inset 0 2px 4px 0 rgb(31 34 41 / 0.04)',
        // Neo — hard offset, no blur
        neo: '4px 4px 0 0 rgb(31 34 41 / 1)',
        'neo-brand': '4px 4px 0 0 rgb(255 52 149 / 1)',
        'neo-lime': '4px 4px 0 0 rgb(167 252 0 / 1)',
        'neo-sm': '3px 3px 0 0 rgb(31 34 41 / 1)',
        'neo-lg': '6px 6px 0 0 rgb(31 34 41 / 1)',
        // Glass
        glass: '0 8px 32px 0 rgb(31 34 41 / 0.12), 0 2px 8px 0 rgb(31 34 41 / 0.06)',
        'glass-sm': '0 4px 16px 0 rgb(31 34 41 / 0.08), 0 1px 4px 0 rgb(31 34 41 / 0.04)',
        'glass-lg': '0 20px 48px 0 rgb(31 34 41 / 0.16), 0 4px 12px 0 rgb(31 34 41 / 0.06)',
        'glass-inset':
          'inset 0 1px 0 0 rgb(255 255 255 / 0.9), inset 0 -1px 0 0 rgb(31 34 41 / 0.04)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'progress-stripe': {
          from: { backgroundPosition: '1rem 0' },
          to: { backgroundPosition: '0 0' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgb(255 52 149 / 0.5)' },
          '70%': { boxShadow: '0 0 0 10px rgb(255 52 149 / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(255 52 149 / 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'fade-in-up': 'fade-in-up 250ms ease-out',
        'scale-in': 'scale-in 180ms ease-out',
        'slide-in-right': 'slide-in-right 220ms ease-out',
        'progress-stripe': 'progress-stripe 1s linear infinite',
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
