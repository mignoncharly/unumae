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
 * The accent family is now the brand: cobalt for action, indigo for depth and
 * violet for the private Remember state. It follows the wordmark while keeping
 * readable contrast in both appearance modes.
 *
 * Colour establishes hierarchy in controls and quiet hero surfaces. It never
 * overlays or recolours a portrait; the person remains the highest-contrast
 * element in the composition.
 */

export const colors = {
  light: {
    background: '#F7F8FC',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceMuted: '#F0F2F8',
    surfaceWarm: '#FBF7F3',
    border: '#E1E4EE',
    borderStrong: '#CCD2E2',
    text: '#11121A',
    textSecondary: '#555B6C',
    textTertiary: '#777E91',
    /** Sampled from the wordmark. White on it reads at 9.3:1. */
    accent: '#315CF5',
    accentText: '#FFFFFF',
    /** The same hue at surface weight, for panels that should feel brand-ish. */
    accentSurface: '#EEF2FF',
    accentStrong: '#2735B8',
    violet: '#6F3FF5',
    violetSurface: '#F3EFFF',
    danger: '#B43A46',
    dangerSurface: '#FFF0F1',
    success: '#25745A',
    successSurface: '#EAF7F1',
    warning: '#93621C',
    warningSurface: '#FFF7E8',
    brandDark: '#0B0B0C',
    brandBlue: '#2735B8',
    brandViolet: '#6F3FF5',
    onBrand: '#FFFFFF',
    onBrandSecondary: '#BFC3CF',
    overlay: 'rgba(11, 11, 12, 0.5)',
  },
  dark: {
    background: '#0B0B0C',
    surface: '#16161A',
    surfaceRaised: '#202027',
    surfaceMuted: '#12131A',
    surfaceWarm: '#1B1717',
    border: '#2B2C35',
    borderStrong: '#414453',
    text: '#F7F7FA',
    textSecondary: '#B1B5C2',
    textTertiary: '#898F9F',
    /** The brand lightened until it reads on near-black: 7.2:1. */
    accent: '#7D9AFF',
    accentText: '#0B0B0C',
    accentSurface: '#182044',
    accentStrong: '#AAB9FF',
    violet: '#B69AFF',
    violetSurface: '#241A3A',
    danger: '#FF8B95',
    dangerSurface: '#351B20',
    success: '#7ED0AE',
    successSurface: '#143127',
    warning: '#E7BA70',
    warningSurface: '#332817',
    brandDark: '#0B0B0C',
    brandBlue: '#2735B8',
    brandViolet: '#6F3FF5',
    onBrand: '#FFFFFF',
    onBrandSecondary: '#BFC3CF',
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
  xxl: 28,
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
    display: 44,
    hero: 52,
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
