import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { exportMyData } from '@/features/moderation/api';
import { useMyProfile, useUpdateProfile } from '@/features/profiles/hooks';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

/**
 * Privacy, and the two rights Article 8.2 grants that nothing else surfaces:
 * hiding the city, and taking the data away.
 *
 * Hiding is not deleting. Somebody who wants their city private this year and
 * public next year should not have to retype it, so the value stays and the
 * publication stops.
 */
export default function PrivacyScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  async function handleExport() {
    setBusy(true);
    setError(undefined);
    try {
      const data = await exportMyData();
      await Clipboard.setStringAsync(JSON.stringify(data, null, 2));
      setToast(t('privacy.exportCopied'));
    } catch (caught) {
      setError(t(toAppError(caught).messageKey));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('privacy.title') }}
      />
      <Screen>
        <Text variant="title3">{t('privacy.heading')}</Text>
        <Text color="textSecondary" style={{ marginTop: theme.spacing.md }}>
          {t('privacy.countryNote')}
        </Text>

        {profile?.city ? (
          <View
            style={{
              marginTop: theme.spacing.xxl,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.lg,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text>{t('privacy.hideCity')}</Text>
              <Text color="textTertiary" variant="footnote">
                {t('privacy.hideCityHint', { city: profile.city })}
              </Text>
            </View>
            <Switch
              accessibilityLabel={t('privacy.hideCity')}
              onValueChange={(value) =>
                updateProfile.mutate({ city_hidden: value })
              }
              value={profile.city_hidden}
            />
          </View>
        ) : null}

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
          <Text color="textTertiary" variant="footnote">
            {t('privacy.yourData').toUpperCase()}
          </Text>
          <Text color="textSecondary">{t('privacy.exportExplain')}</Text>
          <Button
            disabled={busy}
            label={t('privacy.export')}
            onPress={handleExport}
            variant="secondary"
          />
          {error ? (
            <Text color="danger" variant="footnote">
              {error}
            </Text>
          ) : null}
        </View>

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.sm }}>
          <Text color="textTertiary" variant="footnote">
            {t('privacy.neverCollected').toUpperCase()}
          </Text>
          {['location', 'contacts', 'tracking', 'ads'].map((key) => (
            <Text color="textSecondary" key={key}>
              · {t(`privacy.never.${key}`)}
            </Text>
          ))}
        </View>
      </Screen>

      <Toast
        message={toast ?? ''}
        onDismiss={() => setToast(null)}
        tone="success"
        visible={toast !== null}
      />
    </>
  );
}
