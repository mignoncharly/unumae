import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { reportCrash } from '@/lib/errors/reporter';
import { useTheme } from '@/theme';

/**
 * What a person sees when a screen throws.
 *
 * Expo Router already has a boundary, but its production view renders
 * `error.message` — a raw string from a library or the server, on a user's
 * screen. `ErrorState` exists precisely so that never happens, and this keeps
 * that rule at the one place it was still being broken. The message goes to
 * the reporter, redacted; the person gets a sentence they can act on.
 *
 * `retry` re-renders the route rather than reloading the app, so a transient
 * failure costs a tap and not the session.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    reportCrash(error, { scope: 'render', fatal: true });
  }, [error]);

  return (
    <Screen scroll={false} testID="app-error-boundary">
      <View
        style={{
          alignItems: 'center',
          flex: 1,
          gap: theme.spacing.md,
          justifyContent: 'center',
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
          <Icon color="danger" name="alert-triangle" size={24} />
        </View>
        <Text variant="title3" style={{ textAlign: 'center' }}>
          {t('common.error')}
        </Text>
        <Text
          variant="body"
          color="textSecondary"
          style={{ textAlign: 'center' }}
        >
          {t('errors.boundaryBody')}
        </Text>
        <Button
          label={t('common.retry')}
          onPress={() => void retry()}
          testID="app-error-boundary-retry"
          variant="secondary"
        />
      </View>
    </Screen>
  );
}
