import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isPrimary ? theme.colors.accent : 'transparent',
          borderColor: theme.colors.border,
          borderWidth: isPrimary ? 0 : StyleSheet.hairlineWidth,
          borderRadius: theme.radius.full,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Text variant="callout" color={isPrimary ? 'accentText' : 'text'}>
        {label}
      </Text>
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
});
