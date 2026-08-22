import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
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
    update.mutate({ ...(settings ?? DEFAULTS), [key]: value });
  }

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('notifications.title') }}
      />
      <Screen>
        <Text variant="title3">{t('notifications.heading')}</Text>
        <Text color="textSecondary" style={{ marginTop: theme.spacing.md }}>
          {t('notifications.intro')}
        </Text>

        <View style={{ marginTop: theme.spacing.xxl }}>
          {CATEGORIES.map((key) => (
            <View
              key={key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.spacing.lg,
                paddingVertical: theme.spacing.lg,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.colors.border,
              }}
            >
              <View style={{ flex: 1, gap: theme.spacing.xxs }}>
                <Text>{t(`notifications.categories.${key}.label`)}</Text>
                <Text color="textTertiary" variant="footnote">
                  {t(`notifications.categories.${key}.example`)}
                </Text>
              </View>
              <Switch
                accessibilityLabel={t(`notifications.categories.${key}.label`)}
                onValueChange={(value) => toggle(key, value)}
                value={settings?.[key] ?? false}
              />
            </View>
          ))}
        </View>

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
          {available ? (
            <Button
              disabled={busy}
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

        <View style={{ marginTop: theme.spacing.xxl }}>
          <Text color="textTertiary" variant="footnote">
            {t('notifications.promise')}
          </Text>
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

const DEFAULTS: NotificationSettings = {
  daily: false,
  selected: true,
  answered: true,
  anniversary: false,
};
