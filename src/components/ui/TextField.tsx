import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Shown under the field. Replaced by `error` when there is one. */
  hint?: string;
  error?: string | undefined;
}

export function TextField({
  label,
  hint,
  error,
  ...inputProps
}: TextFieldProps) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text color="textTertiary" variant="footnote">
        {label.toUpperCase()}
      </Text>

      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.textTertiary}
        style={{
          minHeight: 44,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: error ? theme.colors.danger : theme.colors.border,
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
          fontSize: theme.typography.sizes.body,
        }}
        {...inputProps}
      />

      {error ? (
        <Text color="danger" variant="footnote">
          {error}
        </Text>
      ) : hint ? (
        <Text color="textTertiary" variant="footnote">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
