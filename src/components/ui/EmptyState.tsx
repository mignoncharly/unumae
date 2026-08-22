import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}

/**
 * Empty is a legitimate state here, not a failure. The Archive begins empty and
 * a Quiet Day is empty by design (Article 5.8), so this never apologises.
 */
export function EmptyState({ title, body, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: theme.spacing.xxxl,
        paddingHorizontal: theme.spacing.xl,
        gap: theme.spacing.md,
      }}
    >
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
    </View>
  );
}
