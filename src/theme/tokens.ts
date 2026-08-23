/**
 * Design tokens.
 *
 * Article 11: editorial, documentary, premium, calm. The person is the star,
 * the interface is furniture.
 *
 * Furniture is allowed to have a colour. For a long time this palette had none
 * at all — `accent` was black — on my reading that brand colour would compete
 * with a photograph. That was stricter than Article 11 asks, and it left the
 * app looking nothing like its own wordmark, which is a blue-to-violet
 * gradient. Cold is not the same thing as calm.
 *
 * So the accent is now the brand, sampled from `assets/splash.png` rather than
 * invented: its ink runs from #000090 through #6000E0, and #3B1FCC sits in the
 * middle of that.
 *
 * Where it is allowed: controls. Buttons, links, the selected tab — the things
 * a person acts on. Where it is not: anywhere near the portrait. No coloured
 * frame, no tinted overlay, no accent on the name or the human number. The rule
 * that mattered was never "no colour", it was "nothing competes with the
 * person", and that one still holds.
 */

export const colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F7F7F5',
    surfaceRaised: '#FFFFFF',
    border: '#E4E4E1',
    text: '#0B0B0C',
    textSecondary: '#5A5A57',
    textTertiary: '#8E8E8A',
    /** Sampled from the wordmark. White on it reads at 9.3:1. */
    accent: '#3B1FCC',
    accentText: '#FFFFFF',
    /** The same hue at surface weight, for panels that should feel brand-ish. */
    accentSurface: '#F7F5FE',
    danger: '#A8342A',
    success: '#2F6B4F',
    overlay: 'rgba(11, 11, 12, 0.5)',
  },
  dark: {
    background: '#0B0B0C',
    surface: '#151517',
    surfaceRaised: '#1D1D20',
    border: '#2A2A2D',
    text: '#F5F5F3',
    textSecondary: '#A8A8A4',
    textTertiary: '#6E6E6B',
    /** The brand lightened until it reads on near-black: 7.2:1. */
    accent: '#A78BFA',
    accentText: '#0B0B0C',
    accentSurface: '#171327',
    danger: '#E0705F',
    success: '#6FAE8C',
    overlay: 'rgba(0, 0, 0, 0.65)',
  },
} as const;

/** 4pt base scale. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  full: 9999,
} as const;

export const typography = {
  /** Human number, countdown: monospaced so digits do not jitter. */
  mono: {
    fontFamily: 'Menlo',
    letterSpacing: 0.5,
  },
  sizes: {
    caption: 12,
    footnote: 13,
    body: 16,
    callout: 18,
    title3: 20,
    title2: 24,
    title1: 30,
    display: 40,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.45,
    /** Portrait prose. Long-form text needs room to breathe. */
    relaxed: 1.6,
  },
} as const;

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

/**
 * Article 11: animation is discreet. `Selecting tomorrow's human…` may be
 * beautiful; it may never be a slot machine.
 */
export const motion = {
  durations: {
    instant: 100,
    fast: 180,
    normal: 260,
    slow: 420,
    /** Reserved for the daily transition only. */
    ceremonial: 900,
  },
  easings: {
    standard: [0.2, 0, 0, 1],
    decelerate: [0, 0, 0, 1],
    accelerate: [0.3, 0, 1, 1],
  },
} as const;

export const breakpoints = {
  phone: 0,
  large: 428,
  tablet: 768,
  desktop: 1024,
} as const;

export type ColorScheme = keyof typeof colors;
export type ColorToken = keyof (typeof colors)['light'];

export const tokens = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  motion,
  breakpoints,
} as const;
