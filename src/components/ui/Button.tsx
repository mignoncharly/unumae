import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ComponentProps<typeof Feather>['name'];
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  icon,
}: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const foreground = isPrimary
    ? 'accentText'
    : isDanger
      ? 'danger'
      : variant === 'ghost'
        ? 'accent'
        : 'text';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isPrimary
            ? theme.colors.accent
            : isDanger
              ? theme.colors.dangerSurface
              : variant === 'secondary'
                ? theme.colors.surfaceRaised
                : 'transparent',
          borderColor: isDanger ? theme.colors.danger : theme.colors.border,
          borderWidth:
            isPrimary || variant === 'ghost' ? 0 : StyleSheet.hairlineWidth,
          borderRadius: theme.radius.full,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          opacity: disabled ? 0.42 : pressed ? 0.72 : 1,
          transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
          ...(variant === 'secondary' ? theme.shadows.subtle : {}),
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {icon ? (
          <Feather color={theme.colors[foreground]} name={icon} size={18} />
        ) : null}
        <Text variant="callout" color={foreground} style={styles.label}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    // Article 11 / accessibility: 44pt minimum touch target.
    minHeight: 44,
  },
  content: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  label: { fontWeight: '600', lineHeight: 22 },
});
