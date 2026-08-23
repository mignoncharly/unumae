import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

/**
 * Terms of service.
 *
 * Short on purpose. The community rules carry the norms; this carries only the
 * legal minimum — what the service is, what you keep, what we may do, and how
 * either side ends it.
 */
const SECTIONS = [
  'whatThisIs',
  'yourAccount',
  'yourContent',
  'ourLicence',
  'beingPublished',
  'whatWeMayDo',
  'noWarranty',
  'ending',
  'changes',
] as const;

export default function TermsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('legal.termsTitle') }}
      />
      <Screen>
        <Text variant="title2">{t('legal.termsTitle')}</Text>
        <Text color="textSecondary" style={{ marginTop: theme.spacing.md }}>
          {t('legal.termsIntro')}
        </Text>

        {SECTIONS.map((key) => (
          <View
            key={key}
            style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.sm }}
          >
            <Text variant="title3">{t(`legal.terms.${key}.title`)}</Text>
            <Text color="textSecondary">{t(`legal.terms.${key}.body`)}</Text>
          </View>
        ))}

        <View style={{ marginTop: theme.spacing.xxxl, gap: theme.spacing.md }}>
          <Link href="/settings/community-rules">
            <Text color="accent">{t('settings.communityRules')} →</Text>
          </Link>
          <Text color="textTertiary" variant="footnote">
            {t('legal.lastUpdated', { date: '23 August 2026' })}
          </Text>
        </View>
      </Screen>
    </>
  );
}
