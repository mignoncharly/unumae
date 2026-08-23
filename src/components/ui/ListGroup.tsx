import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useTheme, type ColorToken } from '@/theme';

import type { IconName } from './Icon';
import { Text } from './Text';

export function ListGroup({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {label ? (
        <Text
          color="textTertiary"
          variant="caption"
          style={styles.sectionLabel}
        >
          {label.toUpperCase()}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.xl,
          borderWidth: StyleSheet.hairlineWidth,
          overflow: 'hidden',
          ...theme.shadows.subtle,
        }}
      >
        {children}
      </View>
    </View>
  );
}

export function ListRow({
  icon,
  iconColor = 'accent',
  title,
  subtitle,
  onPress,
  trailing,
  destructive = false,
  first = false,
}: {
  icon: IconName;
  iconColor?: ColorToken;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  destructive?: boolean;
  first?: boolean;
}) {
  const theme = useTheme();
  const content = (
    <>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: destructive
            ? theme.colors.dangerSurface
            : theme.colors.accentSurface,
          borderRadius: theme.radius.md,
          height: 34,
          justifyContent: 'center',
          width: 34,
        }}
      >
        <Feather
          color={theme.colors[destructive ? 'danger' : iconColor]}
          name={icon}
          size={17}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text color={destructive ? 'danger' : 'text'} style={styles.rowTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text color="textTertiary" variant="footnote">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ??
        (onPress ? (
          <Feather
            color={theme.colors.textTertiary}
            name="chevron-right"
            size={19}
          />
        ) : null)}
    </>
  );

  const rowStyle = {
    alignItems: 'center' as const,
    borderTopColor: theme.colors.border,
    borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    minHeight: 62,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  };

  if (!onPress) return <View style={rowStyle}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [rowStyle, { opacity: pressed ? 0.62 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

export function SettingsSwitch({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <Switch
      accessibilityLabel={label}
      ios_backgroundColor={theme.colors.borderStrong}
      onValueChange={onValueChange}
      thumbColor={theme.colors.surfaceRaised}
      trackColor={{
        false: theme.colors.borderStrong,
        true: theme.colors.accent,
      }}
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  rowTitle: { fontWeight: '500' },
  sectionLabel: { fontWeight: '700', letterSpacing: 1.1, marginLeft: 4 },
});
