import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import type { IconName } from './Icon';
import { Icon } from './Icon';
import { Text } from './Text';

export function Pill({
  label,
  selected = false,
  icon,
  onPress,
}: {
  label: string;
  selected?: boolean;
  icon?: IconName;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const content = (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.spacing.sm,
      }}
    >
      {icon ? (
        <Icon
          color={selected ? 'accentText' : 'textSecondary'}
          name={icon}
          size={15}
        />
      ) : null}
      <Text
        color={selected ? 'accentText' : 'textSecondary'}
        variant="footnote"
        style={{ fontWeight: '600' }}
      >
        {label}
      </Text>
    </View>
  );
  const style = {
    backgroundColor: selected
      ? theme.colors.accent
      : theme.colors.surfaceRaised,
    borderColor: selected ? theme.colors.accent : theme.colors.border,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    justifyContent: 'center' as const,
    minHeight: 40,
    paddingHorizontal: theme.spacing.lg,
  };

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [style, { opacity: pressed ? 0.7 : 1 }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}
