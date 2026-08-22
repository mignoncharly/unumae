import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { signOut } from '@/features/auth/api';
import { useSession } from '@/features/auth/useSession';
import { useMyProfile } from '@/features/profiles/hooks';
import { env } from '@/lib/env';
import { checkConnection, type ConnectionStatus } from '@/lib/supabase';
import { useTheme } from '@/theme';

const STATUS_KEYS: Record<ConnectionStatus, string> = {
  'not-configured': 'connection.notConfigured',
  checking: 'connection.checking',
  connected: 'connection.connected',
  failed: 'connection.failed',
};

function AccountSection() {
  const theme = useTheme();
  const { t } = useTranslation();
  const session = useSession();
  const { data: profile, isLoading } = useMyProfile();

  if (session.status === 'loading') {
    return null;
  }

  // Article 6.1 — a guest is a first-class visitor. This says so, and offers
  // an account without implying anything is missing.
  if (session.status === 'guest') {
    return (
      <View style={{ gap: theme.spacing.md }}>
        <Text color="textSecondary">{t('auth.guestNotice')}</Text>
        <Button
          label={t('auth.signIn')}
          onPress={() => router.push('/(auth)/sign-in')}
          variant="secondary"
        />
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Text color="textSecondary">
        {t('auth.signedInAs', { email: session.session.user.email ?? '' })}
      </Text>

      {!isLoading && profile === null ? (
        <Button
          label={t('profile.finish')}
          onPress={() => router.push('/(onboarding)/profile')}
        />
      ) : null}

      {profile ? (
        <Text color="textTertiary" variant="footnote">
          @{profile.username}
        </Text>
      ) : null}

      <Button
        label={t('auth.signOut')}
        onPress={() => {
          void signOut();
        }}
        variant="secondary"
      />

      <Link href="/how-selection-works">
        <Text color="accent">{t('settings.howSelectionWorks')} →</Text>
      </Link>

      <Link href="/settings/eligibility">
        <Text color="accent">{t('settings.eligibility')} →</Text>
      </Link>

      <Link href="/settings/account">
        <Text color="danger" variant="footnote">
          {t('settings.deleteAccount')} →
        </Text>
      </Link>
    </View>
  );
}

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
          color="textTertiary"
          style={{ marginBottom: theme.spacing.sm }}
          variant="footnote"
        >
          {t('settings.account').toUpperCase()}
        </Text>
        <AccountSection />
      </View>

      <View style={{ marginTop: theme.spacing.xxl }}>
        <Text
          color="textTertiary"
          style={{ marginBottom: theme.spacing.sm }}
          variant="footnote"
        >
          {t('settings.language').toUpperCase()}
        </Text>
        <LanguageSelector />
      </View>

      <View style={{ marginTop: theme.spacing.xxl }}>
        <Text
          color="textTertiary"
          style={{ marginBottom: theme.spacing.sm }}
          variant="footnote"
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
