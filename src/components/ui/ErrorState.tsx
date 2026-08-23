import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { AppError } from '@/lib/errors';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { Icon } from './Icon';
import { Surface } from './Surface';
import { Text } from './Text';

interface ErrorStateProps {
  error: AppError;
  onRetry?: () => void;
}

/**
 * Errors are shown from an i18n key carried by AppError — never from a server
 * message (docs/SECURITY.md). A backend must not be able to put arbitrary text
 * on a user's screen.
 */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Surface
      tone="warm"
      style={{
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.xxxl,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.dangerSurface,
          borderRadius: theme.radius.full,
          height: 56,
          justifyContent: 'center',
          width: 56,
        }}
      >
        <Icon color="danger" name="wifi-off" size={24} />
      </View>
      <Text variant="title3" color="danger" style={{ textAlign: 'center' }}>
        {t(error.messageKey)}
      </Text>
      {onRetry ? (
        <Button
          label={t('common.retry')}
          onPress={onRetry}
          variant="secondary"
        />
      ) : null}
    </Surface>
  );
}
