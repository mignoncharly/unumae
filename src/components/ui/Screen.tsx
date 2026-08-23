import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /**
   * Article 1.7 — the experience ends. Screens scroll to a bottom and stop;
   * nothing in this app loads more content as you reach the end.
   */
  scroll?: boolean;
}

/**
 * The frame every screen sits in.
 *
 * The status bar strip is a padded, painted View *outside* the ScrollView
 * rather than padding on the ScrollView itself. That distinction is the whole
 * point: Android draws behind a transparent status bar, so a ScrollView that
 * owns the inset scrolls its content up underneath the clock. On the settings
 * screen the title ran straight through the time.
 *
 * With the inset on an outer frame, scrolled content is clipped at the frame
 * edge and cannot reach the status bar at all.
 */
export function Screen({ children, scroll = true }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const frame = [
    styles.container,
    { backgroundColor: theme.colors.background, paddingTop: insets.top },
  ];

  if (!scroll) {
    return <View style={frame}>{children}</View>;
  }

  return (
    <View style={frame}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.xl,
          paddingBottom: insets.bottom + theme.spacing.xxxl,
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
