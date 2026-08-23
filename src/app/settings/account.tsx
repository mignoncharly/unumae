import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { deleteMyAccount } from '@/features/profiles/api';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

/**
 * Account deletion — required by Article 8.2 and by App Store review.
 *
 * The consequences are stated in full before the button, including the one
 * people do not expect: an archived Human's entry is removed on request but
 * leaves a tombstone, because the Archive's sequence is permanent even when a
 * person is not (Article 8.6).
 */
export default function AccountScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function handleDelete() {
    setBusy(true);
    setError(undefined);
    try {
      await deleteMyAccount();
      router.replace('/');
    } catch (caught) {
      setError(t(toAppError(caught).messageKey));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('settings.deleteAccount') }}
      />
      <Screen>
        <PageHeader
          subtitle={t('settings.deleteExplain')}
          title={t('settings.deleteAccount')}
        />

        <Surface tone="warm" style={{ gap: theme.spacing.md }}>
          <Text color="textSecondary">{t('settings.deleteExplain')}</Text>
          <Text color="textSecondary">{t('settings.deleteArchiveNote')}</Text>
        </Surface>

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
          {confirming ? (
            <>
              <Text color="danger">{t('settings.deleteConfirm')}</Text>
              <Button
                disabled={busy}
                label={t('settings.deleteConfirmAction')}
                onPress={handleDelete}
                variant="danger"
              />
              <Button
                label={t('common.cancel')}
                onPress={() => setConfirming(false)}
                variant="secondary"
              />
            </>
          ) : (
            <Button
              label={t('settings.deleteAccount')}
              onPress={() => setConfirming(true)}
              variant="danger"
            />
          )}

          {error ? (
            <Text color="danger" variant="footnote">
              {error}
            </Text>
          ) : null}
        </View>
      </Screen>
    </>
  );
}
