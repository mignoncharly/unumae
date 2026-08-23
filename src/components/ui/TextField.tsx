import { useState } from 'react';
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
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text
        color={focused ? 'accent' : 'textSecondary'}
        variant="footnote"
        style={styles.label}
      >
        {label}
      </Text>

      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.textTertiary}
        {...inputProps}
        style={{
          // Both sizes exceed the 44pt minimum touch target.
          minHeight: inputProps.multiline ? 112 : 52,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radius.xl,
          borderWidth: focused || error ? 1.5 : StyleSheet.hairlineWidth,
          borderColor: error
            ? theme.colors.danger
            : focused
              ? theme.colors.accent
              : theme.colors.border,
          backgroundColor: theme.colors.surfaceRaised,
          color: theme.colors.text,
          fontSize: theme.typography.sizes.body,
          textAlignVertical: inputProps.multiline ? 'top' : 'center',
        }}
        onBlur={(event) => {
          setFocused(false);
          inputProps.onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          inputProps.onFocus?.(event);
        }}
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

const styles = StyleSheet.create({
  label: { fontWeight: '600' },
});
