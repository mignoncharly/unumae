import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Surface } from './Surface';
import { Text } from './Text';

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
  icon?: IconName;
}

/**
 * Empty is a legitimate state here, not a failure. The Archive begins empty and
 * a Quiet Day is empty by design (Article 5.8), so this never apologises.
 */
export function EmptyState({
  title,
  body,
  action,
  icon = 'circle',
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <Surface
      tone="accent"
      style={{
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.xxxl,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.surfaceRaised,
          borderRadius: theme.radius.full,
          height: 56,
          justifyContent: 'center',
          width: 56,
        }}
      >
        <Icon color="accent" name={icon} size={24} />
      </View>
      <Text variant="title3" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {body ? (
        <Text color="textSecondary" style={{ textAlign: 'center' }}>
          {body}
        </Text>
      ) : null}
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="secondary"
          style={{ marginTop: theme.spacing.md }}
        />
      ) : null}
    </Surface>
  );
}
