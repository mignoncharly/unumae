import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ArticleSection } from '@/components/ui/ArticleSection';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ListGroup, ListRow, SettingsSwitch } from '@/components/ui/ListGroup';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { shareMyDataExport } from '@/features/privacy/export';
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
      await shareMyDataExport();
      setToast(t('privacy.exportReady'));
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
        <PageHeader
          subtitle={t('privacy.countryNote')}
          title={t('privacy.heading')}
        />

        {profile?.city ? (
          <ListGroup>
            <ListRow
              first
              icon="map-pin"
              subtitle={t('privacy.hideCityHint', { city: profile.city })}
              title={t('privacy.hideCity')}
              trailing={
                <SettingsSwitch
                  label={t('privacy.hideCity')}
                  onValueChange={(value) =>
                    updateProfile.mutate({ city_hidden: value })
                  }
                  value={profile.city_hidden}
                />
              }
            />
          </ListGroup>
        ) : null}

        <View style={{ marginTop: theme.spacing.xxl }}>
          <ListGroup label={t('privacy.safetyControls')}>
            <ListRow
              first
              icon="slash"
              onPress={() => router.push('/settings/blocked-users')}
              subtitle={t('privacy.blockedUsersHint')}
              title={t('privacy.blockedUsers')}
            />
            <ListRow
              icon="message-square"
              onPress={() => router.push('/settings/appeals')}
              subtitle={t('privacy.appealsHint')}
              title={t('privacy.appeals')}
            />
            <ListRow
              icon="book-open"
              onPress={() => router.push('/settings/archive-removal')}
              subtitle={t('privacy.archiveRemovalHint')}
              title={t('privacy.archiveRemoval')}
            />
          </ListGroup>
        </View>

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
          <Text color="textTertiary" variant="footnote">
            {t('privacy.yourData').toUpperCase()}
          </Text>
          <Text color="textSecondary">{t('privacy.exportExplain')}</Text>
          <Text color="textTertiary" variant="footnote">
            {t('privacy.exportBoundary')}
          </Text>
          <Text color="textTertiary" variant="footnote">
            {t('privacy.retainedDeviceFlag')}
          </Text>
          <Button
            disabled={busy}
            icon="download"
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

        <ArticleSection
          icon="shield"
          title={t('privacy.neverCollected')}
          tone="accent"
        >
          <View style={{ gap: theme.spacing.md }}>
            {['location', 'contacts', 'tracking', 'ads'].map((key) => (
              <View
                key={key}
                style={{ flexDirection: 'row', gap: theme.spacing.sm }}
              >
                <Icon color="success" name="check" size={17} />
                <Text color="textSecondary" style={{ flex: 1 }}>
                  {t(`privacy.never.${key}`)}
                </Text>
              </View>
            ))}
          </View>
        </ArticleSection>
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
