import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

/**
 * The privacy notice, as a page a stranger can read before installing.
 *
 * Distinct from Settings → Privacy, which is where a signed-in person acts on
 * these rights. This one only explains, and it names the install identifier
 * plainly rather than leaving it to be discovered.
 */
const SECTIONS = [
  'whatWeCollect',
  'installId',
  'whatWeNever',
  'whoSeesIt',
  'howLong',
  'yourRights',
  'children',
  'contact',
] as const;

export default function PrivacyPolicyScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('legal.privacyTitle') }}
      />
      <Screen>
        <Text variant="title2">{t('legal.privacyTitle')}</Text>
        <Text color="textSecondary" style={{ marginTop: theme.spacing.md }}>
          {t('legal.privacyIntro')}
        </Text>

        {SECTIONS.map((key) => (
          <View
            key={key}
            style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.sm }}
          >
            <Text variant="title3">{t(`legal.privacy.${key}.title`)}</Text>
            <Text color="textSecondary">{t(`legal.privacy.${key}.body`)}</Text>
          </View>
        ))}

        <View style={{ marginTop: theme.spacing.xxxl }}>
          <Text color="textTertiary" variant="footnote">
            {t('legal.lastUpdated', { date: '23 August 2026' })}
          </Text>
        </View>
      </Screen>
    </>
  );
}
