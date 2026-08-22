import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { sendEmailCode, verifyEmailCode } from '@/features/auth/api';
import { track } from '@/lib/analytics';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function handleVerify() {
    setError(undefined);
    setBusy(true);
    try {
      await verifyEmailCode(email, code.trim());
      track('signup_completed', { method: 'email' });
      // Onboarding is decided by whether a profile exists, not by this screen.
      router.dismissAll();
    } catch (caught) {
      setError(t(toAppError(caught).messageKey));
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setError(undefined);
    try {
      await sendEmailCode(email);
    } catch (caught) {
      setError(t(toAppError(caught).messageKey));
    }
  }

  return (
    <Screen>
      <Text variant="title2">{t('auth.codeTitle')}</Text>
      <Text color="textSecondary" style={{ marginTop: theme.spacing.md }}>
        {t('auth.codeSent', { email })}
      </Text>

      <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.lg }}>
        <TextField
          autoComplete="one-time-code"
          autoFocus
          error={error}
          inputMode="numeric"
          keyboardType="number-pad"
          label={t('auth.codeLabel')}
          maxLength={CODE_LENGTH}
          onChangeText={setCode}
          placeholder="000000"
          textContentType="oneTimeCode"
          value={code}
        />

        <Button
          disabled={busy || code.trim().length < CODE_LENGTH}
          label={t('auth.verify')}
          onPress={handleVerify}
        />

        <Button
          label={t('auth.resend')}
          onPress={handleResend}
          variant="secondary"
        />
      </View>
    </Screen>
  );
}
