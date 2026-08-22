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

export function Screen({ children, scroll = true }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const style = [
    styles.container,
    { backgroundColor: theme.colors.background, paddingTop: insets.top },
  ];

  if (!scroll) {
    return <View style={style}>{children}</View>;
  }

  return (
    <ScrollView
      style={style}
      contentContainerStyle={{
        padding: theme.spacing.xl,
        paddingBottom: insets.bottom + theme.spacing.xxxl,
      }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
