import { useColorScheme } from 'react-native';

import { usePreferences } from '@/stores/preferences';

import { colors, tokens, type ColorScheme } from './tokens';

export * from './tokens';

/**
 * The active palette. Article 11 keeps this deliberately thin — there is no
 * theming system to configure, only light and dark.
 */
export function useTheme() {
  const systemScheme: ColorScheme =
    useColorScheme() === 'dark' ? 'dark' : 'light';
  const appearance = usePreferences((state) => state.appearance);
  const scheme: ColorScheme =
    appearance === 'light' || appearance === 'dark' ? appearance : systemScheme;

  return {
    scheme,
    ...tokens,
    // Must come after the spread: tokens.colors holds both palettes, this
    // narrows it to the active one.
    colors: colors[scheme],
  };
}

export type Theme = ReturnType<typeof useTheme>;
