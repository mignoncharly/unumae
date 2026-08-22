import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppleSignInButton } from '@/components/shared/AppleSignInButton';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { sendEmailCode, signInWithApple } from '@/features/auth/api';
import { track } from '@/lib/analytics';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

/**
 * Article 6.1 — this screen is never a gate.
 *
 * It is reached by choosing to act, never by opening the app. Guest viewing is
 * a permanent right, so "continue without an account" is always present and
 * always works.
 *
 * The email path works on every platform, including Expo Go and Android. Apple
 * appears only where it can actually succeed.
 */
export default function SignInScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function handleApple() {
    setError(undefined);
    setBusy(true);
    try {
      track('signup_started', { method: 'apple' });
      await signInWithApple();
      track('signup_completed', { method: 'apple' });
      router.back();
    } catch (caught) {
      const appError = toAppError(caught);
      // Closing the Apple sheet is a decision, not a failure to report.
      if (appError.messageKey !== 'auth.cancelled') {
        setError(t(appError.messageKey));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail() {
    setError(undefined);
    setBusy(true);
    try {
      track('signup_started', { method: 'email' });
      await sendEmailCode(email.trim());
      router.push({
        pathname: '/(auth)/verify',
        params: { email: email.trim() },
      });
    } catch (caught) {
      setError(t(toAppError(caught).messageKey));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text variant="title2">{t('auth.signIn')}</Text>
      <Text color="textSecondary" style={{ marginTop: theme.spacing.md }}>
        {t('auth.signInPrompt')}
      </Text>

      <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.lg }}>
        <AppleSignInButton onPress={handleApple} />

        <TextField
          autoCapitalize="none"
          autoComplete="email"
          error={error}
          inputMode="email"
          keyboardType="email-address"
          label={t('auth.emailLabel')}
          onChangeText={setEmail}
          placeholder={t('auth.emailPlaceholder')}
          value={email}
        />

        <Button
          disabled={busy || !email.includes('@')}
          label={t('auth.sendCode')}
          onPress={handleEmail}
        />
      </View>

      <View style={{ marginTop: theme.spacing.xxxl, gap: theme.spacing.md }}>
        <Text color="textTertiary" variant="footnote">
          {t('auth.guestNotice')}
        </Text>
        <Button
          label={t('auth.continueAsGuest')}
          onPress={() => router.back()}
          variant="secondary"
        />
      </View>
    </Screen>
  );
}
