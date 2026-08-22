import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { AppError } from '@/lib/errors';
import { useTheme } from '@/theme';

import { Button } from './Button';
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
    <View
      style={{
        alignItems: 'center',
        paddingVertical: theme.spacing.xxxl,
        paddingHorizontal: theme.spacing.xl,
        gap: theme.spacing.md,
      }}
    >
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
    </View>
  );
}
