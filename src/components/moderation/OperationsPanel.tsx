import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import {
  useCountryBalance,
  useIntegritySignals,
  useJobHistory,
  useModerationHealth,
} from '@/features/moderation/hooks';
import { useTheme } from '@/theme';
import { countryName, flagEmoji } from '@/utils/country';

/**
 * Running the product, as opposed to reviewing its content.
 *
 * Every number here is a monitor. None of them is wired to anything: the draw
 * takes eligibility and chance (Article 5.2), declining costs nothing
 * (Article 5.5), and there are four notification categories and no more. A
 * moderator reads these and decides what to do as a person — which is the whole
 * design, and `tests/scale-schema.test.ts` fails the build if the draw ever
 * learns any of it.
 *
 * The order is deliberate: what is broken now, then what is drifting, then what
 * is suspicious. Queue age first because it is the only one costing somebody a
 * day while you read it.
 */
export function OperationsPanel() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  const { data: health } = useModerationHealth(true);
  const { data: jobs } = useJobHistory(true);
  const { data: balance } = useCountryBalance(true);
  const { data: integrity } = useIntegritySignals(true);

  const oldestPortrait =
    health?.find((row) => row.measure === 'oldest_portrait_hours')?.value ?? 0;

  return (
    <View style={{ gap: theme.spacing.xxl }}>
      <Section title={t('operations.health')}>
        {/*
          A portrait waiting is a cycle waiting, and unlike everything else that
          can go wrong, nobody is told — the selected person sees "submitted"
          and waits. So the age is called out rather than left in the list.
        */}
        {oldestPortrait >= 12 ? (
          <Text color="danger" variant="callout">
            {t('operations.queueWarning', { hours: oldestPortrait })}
          </Text>
        ) : null}

        {(health ?? []).map((row) => (
          <Row
            hint={row.detail}
            key={row.measure}
            label={t(`operations.measures.${row.measure}`, {
              defaultValue: row.measure,
            })}
            value={String(row.value)}
          />
        ))}
      </Section>

      <Section title={t('operations.jobs')}>
        <Text color="textTertiary" variant="footnote">
          {t('operations.jobsIntro')}
        </Text>
        {jobs && jobs.length > 0 ? (
          jobs
            .slice(0, 8)
            .map((run, index) => (
              <Row
                hint={run.detail ?? ''}
                key={`${run.job}-${run.ranAt}-${index}`}
                label={`${run.ok ? '' : '⚠ '}${run.job}`}
                value={run.ranAt.slice(0, 16).replace('T', ' ')}
              />
            ))
        ) : (
          <Text color="textTertiary" variant="footnote">
            {t('operations.jobsEmpty')}
          </Text>
        )}
      </Section>

      <Section title={t('operations.balance')}>
        <Text color="textTertiary" variant="footnote">
          {t('operations.balanceIntro')}
        </Text>
        {(balance ?? []).slice(0, 12).map((row) => (
          <Row
            key={row.countryCode}
            label={`${flagEmoji(row.countryCode)} ${countryName(
              row.countryCode,
              i18n.language
            )}`}
            value={`${row.poolShare}% → ${row.archiveShare}%`}
          />
        ))}
      </Section>

      <Section title={t('operations.integrity')}>
        <Text color="textTertiary" variant="footnote">
          {t('operations.integrityIntro')}
        </Text>
        {(integrity ?? []).map((row) => (
          <Row
            hint={row.detail}
            key={row.signal}
            label={t(`operations.signals.${row.signal}`, {
              defaultValue: row.signal,
            })}
            value={String(row.count)}
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
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        paddingVertical: theme.spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
        gap: theme.spacing.xs,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: theme.spacing.md,
        }}
      >
        <Text style={{ flex: 1 }} variant="footnote">
          {label}
        </Text>
        <Text color="textSecondary" variant="mono">
          {value}
        </Text>
      </View>
      {hint ? (
        <Text color="textTertiary" variant="caption">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
