import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export function Surface({
  children,
  tone = 'default',
  padding = 'lg',
  style,
}: {
  children: ReactNode;
  tone?: 'default' | 'muted' | 'accent' | 'violet' | 'warm';
  padding?: 'none' | 'md' | 'lg' | 'xl';
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const backgrounds = {
    default: theme.colors.surfaceRaised,
    muted: theme.colors.surfaceMuted,
    accent: theme.colors.accentSurface,
    violet: theme.colors.violetSurface,
    warm: theme.colors.surfaceWarm,
  } as const;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: backgrounds[tone],
          borderColor: tone === 'default' ? theme.colors.border : 'transparent',
          borderRadius: theme.radius.xl,
          padding: theme.spacing[padding],
        },
        tone === 'default' ? theme.shadows.subtle : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: StyleSheet.hairlineWidth },
});
