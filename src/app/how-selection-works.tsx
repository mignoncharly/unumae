import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  CountryRepresentation,
  SelectionStats,
} from '@/components/stats/SelectionStats';
import { ArticleSection } from '@/components/ui/ArticleSection';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import {
  ACCEPTANCE_WINDOW_HOURS,
  BACKUP_CANDIDATE_COUNT,
  MIN_ACCOUNT_AGE,
  POOL_FREEZE_DAYS_BEFORE,
} from '@/constants/constitution';
import { useTheme } from '@/theme';

/**
 * The public answer to "why was this person selected?" (Article 12).
 *
 * Open to guests, because the people most entitled to be sceptical about a
 * fairness claim are the ones who have not signed up. Every number on this page
 * comes from src/constants/constitution.ts, which is asserted against the
 * constitution itself — so the page cannot drift from what the product does.
 */
function Section({ title, children }: { title: string; children: string }) {
  return <ArticleSection title={title}>{children}</ArticleSection>;
}

export default function HowSelectionWorksScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  const nevers = [
    'howSelection.neverPay',
    'howSelection.neverFollowers',
    'howSelection.neverBoost',
    'howSelection.neverSponsor',
    'howSelection.neverInfluencer',
    'howSelection.neverAlgorithm',
  ];

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('howSelection.title') }}
      />
      <Screen>
        <PageHeader
          subtitle={t('howSelection.intro')}
          title={t('howSelection.heading')}
        />

        {/*
          The claim, and then the number it rests on. Putting them next to each
          other is the point: "the draw is fair" is an assertion, "1,042 people
          are waiting and one of them is chosen today" is checkable.
        */}
        <Surface tone="accent">
          <SelectionStats />
        </Surface>

        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
          <Section title={t('howSelection.poolTitle')}>
            {t('howSelection.poolBody', {
              days: POOL_FREEZE_DAYS_BEFORE,
              age: MIN_ACCOUNT_AGE,
            })}
          </Section>
          <Section title={t('howSelection.drawTitle')}>
            {t('howSelection.drawBody', { backups: BACKUP_CANDIDATE_COUNT })}
          </Section>
          <Section title={t('howSelection.acceptTitle')}>
            {t('howSelection.acceptBody', { hours: ACCEPTANCE_WINDOW_HOURS })}
          </Section>
          <Section title={t('howSelection.onceTitle')}>
            {t('howSelection.onceBody')}
          </Section>
          <Section title={t('howSelection.verifyTitle')}>
            {t('howSelection.verifyBody')}
          </Section>
        </View>

        {/* The list of things that are never inputs. Stated plainly, because
            the claim is only worth making if it is specific. */}
        <ArticleSection
          icon="x-circle"
          title={t('howSelection.neverTitle')}
          tone="warm"
        >
          <View style={{ gap: theme.spacing.md }}>
            {nevers.map((key) => (
              <View
                key={key}
                style={{ flexDirection: 'row', gap: theme.spacing.sm }}
              >
                <Icon color="danger" name="x" size={16} />
                <Text color="textSecondary" style={{ flex: 1 }}>
                  {t(key)}
                </Text>
              </View>
            ))}
          </View>
        </ArticleSection>

        <View style={{ marginTop: theme.spacing.md }}>
          <Section title={t('howSelection.safetyTitle')}>
            {t('howSelection.safetyBody')}
          </Section>
        </View>

        <Surface style={{ marginTop: theme.spacing.md, gap: theme.spacing.md }}>
          <Text variant="title3">{t('stats.byCountry')}</Text>
          <CountryRepresentation />
          <Text color="textTertiary" variant="footnote">
            {t('stats.floorNote')}
          </Text>
        </Surface>

        <View style={{ marginTop: theme.spacing.xxxl }}>
          <Text color="textTertiary" variant="footnote">
            {t('howSelection.footer')}
          </Text>
        </View>
      </Screen>
    </>
  );
}
