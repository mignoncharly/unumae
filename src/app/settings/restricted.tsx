import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { shareMyDataExport } from '@/features/privacy/export';
import { useMyProfile } from '@/features/profiles/hooks';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

export default function RestrictedAccountScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: profile } = useMyProfile();
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string>();

  const status = profile?.account_status ?? 'suspended';

  async function handleExport() {
    setExporting(true);
    setMessage(undefined);
    try {
      await shareMyDataExport();
      setMessage(t('privacy.exportReady'));
    } catch (caught) {
      setMessage(t(toAppError(caught).messageKey));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <PageHeader
          subtitle={t(`accountRestriction.status.${status}`)}
          title={t('accountRestriction.title')}
        />

        <Surface tone="warm" style={{ gap: theme.spacing.md }}>
          <Text color="textSecondary">
            {t('accountRestriction.availableActions')}
          </Text>
        </Surface>

        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xxl }}>
          {status !== 'deletion_pending' && status !== 'deleted' ? (
            <Button
              icon="message-square"
              label={t('privacy.appeals')}
              onPress={() => router.push('/settings/appeals')}
              variant="secondary"
            />
          ) : null}
          <Button
            disabled={exporting}
            icon="download"
            label={t('privacy.export')}
            onPress={handleExport}
            variant="secondary"
          />
          <Button
            icon="trash-2"
            label={t('settings.deleteAccount')}
            onPress={() => router.push('/settings/account')}
            variant="danger"
          />
          {message ? (
            <Text color="textSecondary" variant="footnote">
              {message}
            </Text>
          ) : null}
        </View>
      </Screen>
    </>
  );
}
