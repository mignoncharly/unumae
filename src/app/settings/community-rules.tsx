import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ArticleSection } from '@/components/ui/ArticleSection';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { acceptCommunityRules } from '@/features/portraits/api';
import { useMyProfile } from '@/features/profiles/hooks';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

/**
 * The community rules, and the one place they can be accepted.
 *
 * Acceptance is a hard requirement for the draw (Article 5.1), so it is a
 * deliberate action on a screen that shows the whole text — never a checkbox
 * beside a link nobody opens.
 */
const RULE_KEYS = [
  'onePerson',
  'askQuestions',
  'noCompeting',
  'beTruthful',
  'neverAllowed',
  'protectPeople',
  'ifSelected',
  'breakingRules',
] as const;

export default function CommunityRulesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: profile, refetch } = useMyProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const accepted = profile?.accepted_rules_at != null;

  async function handleAccept() {
    setBusy(true);
    setError(undefined);
    try {
      await acceptCommunityRules();
      await refetch();
    } catch (caught) {
      setError(t(toAppError(caught).messageKey));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('rules.title') }} />
      <Screen>
        <PageHeader subtitle={t('rules.intro')} title={t('rules.heading')} />

        <View style={{ gap: theme.spacing.md }}>
          {RULE_KEYS.map((key, index) => (
            <ArticleSection
              icon={
                index === 0 ? 'user' : index === 4 ? 'shield' : 'message-circle'
              }
              key={key}
              title={`${index + 1}. ${t(`rules.${key}.title`)}`}
            >
              {t(`rules.${key}.body`)}
            </ArticleSection>
          ))}
        </View>

        <Surface
          tone="accent"
          style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}
        >
          {accepted ? (
            <Text color="textSecondary">{t('rules.alreadyAccepted')}</Text>
          ) : (
            <>
              <Button
                disabled={busy || !profile}
                label={t('rules.accept')}
                onPress={handleAccept}
              />
              {!profile ? (
                <Text color="textTertiary" variant="footnote">
                  {t('rules.needProfile')}
                </Text>
              ) : null}
            </>
          )}

          {error ? (
            <Text color="danger" variant="footnote">
              {error}
            </Text>
          ) : null}
        </Surface>
      </Screen>
    </>
  );
}
