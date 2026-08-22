import { Stack } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text, type TextVariant } from '@/components/ui/Text';
import { useTheme } from '@/theme';

const TEXT_VARIANTS: TextVariant[] = [
  'display',
  'title1',
  'title2',
  'title3',
  'callout',
  'body',
  'footnote',
  'caption',
  'mono',
];

/**
 * Design token gallery. One of the Phase 1 "done" criteria is being able to
 * display the theme tokens; this is that screen, and it stays useful as Phase 2
 * refines the palette.
 */
export default function TokensScreen() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Design tokens' }} />
      <Screen>
        <Text variant="title2">Colors — {theme.scheme}</Text>
        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.sm }}>
          {Object.entries(theme.colors).map(([name, value]) => (
            <View
              key={name}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: theme.radius.sm,
                  backgroundColor: value,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              />
              <Text variant="footnote">{name}</Text>
              <Text variant="footnote" color="textTertiary">
                {value}
              </Text>
            </View>
          ))}
        </View>

        <Text variant="title2" style={{ marginTop: theme.spacing.xxl }}>
          Typography
        </Text>
        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
          {TEXT_VARIANTS.map((variant) => (
            <Text key={variant} variant={variant}>
              {variant} — 8 billion people
            </Text>
          ))}
        </View>

        <Text variant="title2" style={{ marginTop: theme.spacing.xxl }}>
          Spacing
        </Text>
        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.sm }}>
          {Object.entries(theme.spacing).map(([name, value]) => (
            <View
              key={name}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View
                style={{
                  width: Math.max(value, 1),
                  height: 10,
                  backgroundColor: theme.colors.accent,
                }}
              />
              <Text variant="footnote" color="textTertiary">
                {name} · {value}
              </Text>
            </View>
          ))}
        </View>

        <Text variant="title2" style={{ marginTop: theme.spacing.xxl }}>
          Radius
        </Text>
        <View
          style={{
            marginTop: theme.spacing.lg,
            flexDirection: 'row',
            gap: theme.spacing.md,
          }}
        >
          {Object.entries(theme.radius).map(([name, value]) => (
            <View key={name} style={{ alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: Math.min(value, 22),
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              />
              <Text variant="caption" color="textTertiary">
                {name}
              </Text>
            </View>
          ))}
        </View>
      </Screen>
    </>
  );
}
