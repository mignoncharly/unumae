import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { env } from '@/lib/env';
import { checkConnection, type ConnectionStatus } from '@/lib/supabase';
import { useTheme } from '@/theme';

const STATUS_KEYS: Record<ConnectionStatus, string> = {
  'not-configured': 'connection.notConfigured',
  checking: 'connection.checking',
  connected: 'connection.connected',
  failed: 'connection.failed',
};

export default function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [status, setStatus] = useState<ConnectionStatus>('checking');

  useEffect(() => {
    let active = true;
    void checkConnection().then((result) => {
      if (active) {
        setStatus(result);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen>
      <Text variant="title1">{t('settings.title')}</Text>

      <View style={{ marginTop: theme.spacing.xxl }}>
        <Text
          variant="footnote"
          color="textTertiary"
          style={{ marginBottom: theme.spacing.sm }}
        >
          {t('settings.language').toUpperCase()}
        </Text>
        <LanguageSelector />
      </View>

      <View style={{ marginTop: theme.spacing.xxl }}>
        <Text
          variant="footnote"
          color="textTertiary"
          style={{ marginBottom: theme.spacing.sm }}
        >
          {t('settings.developer').toUpperCase()}
        </Text>

        <View style={{ gap: theme.spacing.sm }}>
          <Text color="textSecondary">
            {t('settings.environment')}: {env.appEnv}
          </Text>
          <Text color="textSecondary">
            {t('settings.connection')}: {t(STATUS_KEYS[status])}
          </Text>
          <Link href="/dev/tokens">
            <Text color="accent">{t('settings.designTokens')} →</Text>
          </Link>
          <Link href="/dev/components">
            <Text color="accent">{t('settings.components')} →</Text>
          </Link>
          <Link href="/dev/preview">
            <Text color="accent">{t('settings.uxPreview')} →</Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
