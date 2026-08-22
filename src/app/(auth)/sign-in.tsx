import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

/**
 * Phase 3 implements Sign in with Apple and email magic links.
 *
 * The important part is already true here: this screen is never a gate. Article
 * 6.1 makes guest viewing a permanent right — an account is required to ask,
 * vote, Remember and enter the draw, and for nothing else.
 */
export default function SignInScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Screen>
      <Text variant="title2">{t('auth.signIn')}</Text>
      <Text
        color="textSecondary"
        style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.xxl }}
      >
        {t('auth.signInPrompt')}
      </Text>

      <Text variant="footnote" color="textTertiary">
        {t('auth.guestNotice')}
      </Text>

      <View style={{ marginTop: theme.spacing.xxl }}>
        <Button
          label={t('auth.continueAsGuest')}
          variant="secondary"
          onPress={() => router.back()}
        />
      </View>
    </Screen>
  );
}
