import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import {
  useGrowthGate,
  useParticipationMix,
  useRetentionCohorts,
} from '@/features/moderation/hooks';
import { useTheme } from '@/theme';

/**
 * The numbers that decide whether we grow.
 *
 * Deliberately not a dashboard. There are no charts, no trend arrows and no
 * totals to feel good about — four pass/fail checks that were written down
 * before anyone saw a result, and the cohorts they came from.
 *
 * The one thing it goes out of its way to show honestly is immaturity: a cohort
 * that has not reached day seven reads "too early", never 0%. Showing zero
 * there would make every young cohort look like a failure and would make the
 * gate answerable by waiting rather than by improving.
 */
export function SignalsPanel() {
  const theme = useTheme();
  const { t } = useTranslation();

  const { data: gate } = useGrowthGate(true);
  const { data: mix } = useParticipationMix(true);
  const { data: cohorts } = useRetentionCohorts(true);

  const decided = gate !== undefined && gate.length > 0;
  const allPassed = decided && gate.every((check) => check.passed);

  return (
    <View style={{ gap: theme.spacing.xxl }}>
      <Text color="textSecondary" variant="footnote">
        {t('moderation.signalsIntro')}
      </Text>

      <Section title={t('moderation.gate')}>
        <Text color="textTertiary" variant="footnote">
          {t('moderation.gateIntro')}
        </Text>

        {(gate ?? []).map((check) => (
          <Row
            key={check.check}
            label={t(`moderation.checks.${check.check}`)}
            passed={check.passed}
            value={`${check.actual}% / ${check.threshold}%`}
          />
        ))}

        {decided ? (
          <Text
            color={allPassed ? 'text' : 'textSecondary'}
            style={{ marginTop: theme.spacing.md }}
            variant="callout"
          >
            {allPassed ? t('moderation.gateOpen') : t('moderation.gateBlocked')}
          </Text>
        ) : null}
      </Section>

      <Section title={t('moderation.participation')}>
        {(mix ?? []).map((segment) => (
          <Row
            key={segment.segment}
            label={t(`moderation.${segment.segment}`)}
            value={`${segment.percent}% · ${segment.installs}`}
          />
        ))}
      </Section>

      <Section title={t('moderation.cohorts')}>
        <Row
          header
          label={t('moderation.cohortDate')}
          value={`${t('moderation.installs')} · ${t(
            'moderation.d1'
          )} · ${t('moderation.d7')}`}
        />
        {(cohorts ?? []).map((cohort) => (
          <Row
            key={cohort.cohortDate}
            label={cohort.cohortDate}
            value={`${cohort.installs} · ${
              cohort.d1Percent === null
                ? t('moderation.tooEarly')
                : `${cohort.d1Percent}%`
            } · ${
              cohort.d7Percent === null
                ? t('moderation.tooEarly')
                : `${cohort.d7Percent}%`
            }`}
          />
        ))}
      </Section>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text accessibilityRole="header" color="textTertiary" variant="footnote">
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  passed,
  header = false,
}: {
  label: string;
  value: string;
  passed?: boolean;
  header?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
      }}
    >
      <Text
        color={header ? 'textTertiary' : 'text'}
        style={{ flex: 1 }}
        variant="footnote"
      >
        {label}
      </Text>
      <Text color="textSecondary" variant="mono">
        {value}
      </Text>
      {passed === undefined ? null : (
        // Read out in words rather than shown as a colour, so the verdict
        // survives both a screen reader and colour blindness.
        <Text color={passed ? 'text' : 'textTertiary'} variant="footnote">
          {passed ? t('moderation.gatePass') : t('moderation.gateFail')}
        </Text>
      )}
    </View>
  );
}
