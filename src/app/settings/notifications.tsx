import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ListGroup, ListRow, SettingsSwitch } from '@/components/ui/ListGroup';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  type NotificationSettings,
} from '@/features/notifications/hooks';
import {
  isPushAvailable,
  pushUnavailableReason,
  registerForPush,
} from '@/features/notifications/push';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

const CATEGORIES: (keyof NotificationSettings)[] = [
  'daily',
  'selected',
  'answered',
  'anniversary',
];

/**
 * Four categories, four switches, and nothing else.
 *
 * The plan named the thing to avoid: "COME BACK!!! 🔥🔥🔥". So there is no
 * category for re-engagement, none for streaks, and no way for the product to
 * contact somebody about anything other than these four events.
 */
export default function NotificationsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: settings } = useNotificationSettings();
  const update = useUpdateNotificationSettings();

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const available = isPushAvailable();
  const reason = pushUnavailableReason();

  async function handleEnable() {
    setBusy(true);
    setError(undefined);
    try {
      const token = await registerForPush();
      setToast(
        token ? t('notifications.enabled') : t('notifications.declined')
      );
    } catch (caught) {
      setError(t(toAppError(caught).messageKey));
    } finally {
      setBusy(false);
    }
  }

  function toggle(key: keyof NotificationSettings, value: boolean) {
    setError(undefined);
    update.mutate(
      { key, value },
      {
        onError: (caught) => setError(t(toAppError(caught).messageKey)),
      }
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('notifications.title') }}
      />
      <Screen>
        <PageHeader
          subtitle={t('notifications.intro')}
          title={t('notifications.heading')}
        />

        <ListGroup>
          {CATEGORIES.map((key) => (
            <ListRow
              first={key === CATEGORIES[0]}
              icon={
                key === 'daily'
                  ? 'sunrise'
                  : key === 'selected'
                    ? 'award'
                    : key === 'answered'
                      ? 'message-circle'
                      : 'calendar'
              }
              key={key}
              subtitle={t(`notifications.categories.${key}.example`)}
              title={t(`notifications.categories.${key}.label`)}
              trailing={
                <SettingsSwitch
                  label={t(`notifications.categories.${key}.label`)}
                  onValueChange={(value) => toggle(key, value)}
                  value={settings?.[key] ?? false}
                />
              }
            />
          ))}
        </ListGroup>

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
          {available ? (
            <Button
              disabled={busy}
              icon="bell"
              label={t('notifications.enable')}
              onPress={handleEnable}
              variant="secondary"
            />
          ) : (
            <Text color="textTertiary" variant="footnote">
              {reason === 'expo-go'
                ? t('notifications.needsBuild')
                : t('notifications.unsupported')}
            </Text>
          )}

          {error ? (
            <Text color="danger" variant="footnote">
              {error}
            </Text>
          ) : null}
        </View>

        <Surface tone="accent" style={{ marginTop: theme.spacing.xxl }}>
          <Text color="textTertiary" variant="footnote">
            {t('notifications.promise')}
          </Text>
        </Surface>
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
