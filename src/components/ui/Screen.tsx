import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /**
   * Article 1.7 — the experience ends. Screens scroll to a bottom and stop;
   * nothing in this app loads more content as you reach the end.
   */
  scroll?: boolean;
  padded?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
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
export function Screen({
  children,
  scroll = true,
  padded = true,
  contentContainerStyle,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const frame = [
    styles.container,
    { backgroundColor: theme.colors.background, paddingTop: insets.top },
  ];

  if (!scroll) {
    return (
      <View
        style={[
          frame,
          padded && styles.content,
          padded && { paddingBottom: insets.bottom + theme.spacing.xl },
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={frame}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          padded && styles.content,
          padded && {
            paddingBottom: insets.bottom + theme.spacing.huge,
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    width: '100%',
    maxWidth: 680,
  },
});
