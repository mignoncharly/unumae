import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { OperationsPanel } from '@/components/moderation/OperationsPanel';
import { SignalsPanel } from '@/components/moderation/SignalsPanel';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import {
  useAmIModerator,
  useModerationActions,
  usePortraitQueue,
  useQuestionQueue,
  useReportQueue,
} from '@/features/moderation/hooks';
import { useTheme } from '@/theme';

type Tab = 'portraits' | 'questions' | 'reports' | 'signals' | 'operations';

/**
 * The moderation console.
 *
 * The plan said it does not need to be beautiful — it needs to be reliable.
 * So it is a plain list of what is waiting, with the two decisions that matter
 * next to each item, and nothing that could be misread under time pressure.
 *
 * Hiding this screen is a courtesy, not a control: every action calls a
 * function that refuses in the database unless the caller is a moderator.
 */
export default function AdminScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: isModerator, isLoading } = useAmIModerator();
  const [tab, setTab] = useState<Tab>('portraits');
  const [toast, setToast] = useState<string | null>(null);

  const enabled = isModerator === true;
  const { data: portraits } = usePortraitQueue(enabled && tab === 'portraits');
  const { data: questions } = useQuestionQueue(enabled && tab === 'questions');
  const { data: reports } = useReportQueue(enabled && tab === 'reports');
  const actions = useModerationActions();

  if (isLoading) {
    return (
      <Screen>
        <Skeleton height={180} radius={theme.radius.xl} />
      </Screen>
    );
  }

  if (!enabled) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <Screen>
          <EmptyState icon="lock" title={t('moderation.notModerator')} />
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('moderation.title') }}
      />
      <Screen>
        <PageHeader
          subtitle={t('moderation.everyDecisionLogged')}
          title={t('moderation.title')}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {(
              [
                'portraits',
                'questions',
                'reports',
                'signals',
                'operations',
              ] as Tab[]
            ).map((value) => (
              <Pill
                key={value}
                onPress={() => setTab(value)}
                selected={tab === value}
                label={t(`moderation.${value}`)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={{ marginTop: theme.spacing.xl }}>
          {tab === 'portraits' ? (
            portraits && portraits.length > 0 ? (
              portraits.map((item) => (
                <QueueItem
                  key={item.portrait_id}
                  meta={`${item.selection_date} · ${item.country_code} · ${t(
                    'moderation.verification'
                  )}: ${item.verification_level}${
                    item.open_reports > 0
                      ? ` · ${t('moderation.openReports', {
                          count: item.open_reports,
                        })}`
                      : ''
                  }`}
                  onApprove={() => {
                    actions.portrait.mutate([item.portrait_id, 'approved']);
                    setToast(t('moderation.approved'));
                  }}
                  onReject={() => {
                    actions.portrait.mutate([item.portrait_id, 'rejected']);
                    setToast(t('moderation.rejected'));
                  }}
                  title={item.display_name}
                />
              ))
            ) : (
              <EmptyState title={t('moderation.queueEmpty')} />
            )
          ) : null}

          {tab === 'questions' ? (
            questions && questions.length > 0 ? (
              questions.map((item) => (
                <QueueItem
                  key={item.question_id}
                  meta={
                    item.auto_flags
                      ? `${t('moderation.autoFlagged')}: ${item.auto_flags}`
                      : t('moderation.noFlags')
                  }
                  onApprove={() => {
                    actions.question.mutate([item.question_id, 'approved']);
                    setToast(t('moderation.approved'));
                  }}
                  onReject={() => {
                    actions.question.mutate([item.question_id, 'rejected']);
                    setToast(t('moderation.rejected'));
                  }}
                  title={item.body}
                />
              ))
            ) : (
              <EmptyState title={t('moderation.queueEmpty')} />
            )
          ) : null}

          {tab === 'reports' ? (
            reports && reports.length > 0 ? (
              reports.map((item) => (
                <QueueItem
                  approveLabel={t('moderation.dismiss')}
                  key={item.report_id}
                  meta={`${item.target_type} · ${item.created_at.slice(0, 10)}${
                    item.note ? ` · ${item.note}` : ''
                  }`}
                  onApprove={() => {
                    actions.report.mutate([item.report_id, false]);
                    setToast(t('moderation.dismissed'));
                  }}
                  onReject={() => {
                    actions.report.mutate([item.report_id, true]);
                    setToast(t('moderation.actioned'));
                  }}
                  rejectLabel={t('moderation.action')}
                  title={t(`report.reasons.${item.reason}`)}
                />
              ))
            ) : (
              <EmptyState title={t('moderation.queueEmpty')} />
            )
          ) : null}

          {tab === 'signals' ? <SignalsPanel /> : null}

          {tab === 'operations' ? <OperationsPanel /> : null}
        </View>
      </Screen>

      <Toast
        message={toast ?? ''}
        onDismiss={() => setToast(null)}
        tone="neutral"
        visible={toast !== null}
      />
    </>
  );
}

function QueueItem({
  title,
  meta,
  onApprove,
  onReject,
  approveLabel,
  rejectLabel,
}: {
  title: string;
  meta: string;
  onApprove: () => void;
  onReject: () => void;
  approveLabel?: string;
  rejectLabel?: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Surface style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
      <Text variant="callout">{title}</Text>
      <Text color="textTertiary" variant="footnote">
        {meta}
      </Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Button
          label={approveLabel ?? t('moderation.approve')}
          onPress={onApprove}
          style={{ flex: 1 }}
        />
        <Button
          label={rejectLabel ?? t('moderation.reject')}
          onPress={onReject}
          style={{ flex: 1 }}
          variant="secondary"
        />
      </View>
    </Surface>
  );
}
