import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

/**
 * The page a shared link should make sense on.
 *
 * Somebody arrives here from a message, having never heard of this, and has
 * about fifteen seconds. So it opens with the whole idea in two sentences and
 * only then explains itself.
 */
export default function AboutScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  const sections = ['idea', 'notSocial', 'fairness', 'archive'] as const;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('about.title') }} />
      <Screen>
        <Text variant="display">{t('common.appName')}</Text>
        <Text
          color="textSecondary"
          style={{ marginTop: theme.spacing.sm }}
          variant="callout"
        >
          {t('common.tagline')}
        </Text>

        <Text style={{ marginTop: theme.spacing.xxl }} variant="callout">
          {t('about.promise')}
        </Text>

        {sections.map((key) => (
          <View
            key={key}
            style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.sm }}
          >
            <Text variant="title3">{t(`about.${key}.title`)}</Text>
            <Text color="textSecondary">{t(`about.${key}.body`)}</Text>
          </View>
        ))}

        <View style={{ marginTop: theme.spacing.xxxl, gap: theme.spacing.md }}>
          <Link href="/how-selection-works">
            <Text color="accent">{t('settings.howSelectionWorks')} →</Text>
          </Link>
          <Link href="/settings/community-rules">
            <Text color="accent">{t('settings.communityRules')} →</Text>
          </Link>
          <Link href="/legal/privacy">
            <Text color="accent">{t('legal.privacyTitle')} →</Text>
          </Link>
          <Link href="/legal/terms">
            <Text color="accent">{t('legal.termsTitle')} →</Text>
          </Link>
        </View>
      </Screen>
    </>
  );
}
