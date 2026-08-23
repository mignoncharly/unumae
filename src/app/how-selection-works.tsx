import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  CountryRepresentation,
  SelectionStats,
} from '@/components/stats/SelectionStats';
import { Screen } from '@/components/ui/Screen';
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
  const theme = useTheme();
  return (
    <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.sm }}>
      <Text variant="title3">{title}</Text>
      <Text color="textSecondary">{children}</Text>
    </View>
  );
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
        <Text variant="title1">{t('howSelection.heading')}</Text>
        <Text
          color="textSecondary"
          style={{ marginTop: theme.spacing.md }}
          variant="callout"
        >
          {t('howSelection.intro')}
        </Text>

        {/*
          The claim, and then the number it rests on. Putting them next to each
          other is the point: "the draw is fair" is an assertion, "1,042 people
          are waiting and one of them is chosen today" is checkable.
        */}
        <View style={{ marginTop: theme.spacing.xxl }}>
          <SelectionStats />
        </View>

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

        {/* The list of things that are never inputs. Stated plainly, because
            the claim is only worth making if it is specific. */}
        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
          <Text variant="title3">{t('howSelection.neverTitle')}</Text>
          {nevers.map((key) => (
            <Text color="textSecondary" key={key}>
              · {t(key)}
            </Text>
          ))}
        </View>

        <Section title={t('howSelection.safetyTitle')}>
          {t('howSelection.safetyBody')}
        </Section>

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
          <Text variant="title3">{t('stats.byCountry')}</Text>
          <CountryRepresentation />
          <Text color="textTertiary" variant="footnote">
            {t('stats.floorNote')}
          </Text>
        </View>

        <View style={{ marginTop: theme.spacing.xxxl }}>
          <Text color="textTertiary" variant="footnote">
            {t('howSelection.footer')}
          </Text>
        </View>
      </Screen>
    </>
  );
}
