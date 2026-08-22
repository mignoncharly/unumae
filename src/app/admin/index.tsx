import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
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

type Tab = 'portraits' | 'questions' | 'reports';

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
        <Text color="textSecondary">{t('common.loading')}</Text>
      </Screen>
    );
  }

  if (!enabled) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <Screen>
          <EmptyState title={t('moderation.notModerator')} />
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
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {(['portraits', 'questions', 'reports'] as Tab[]).map((value) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: tab === value }}
              key={value}
              onPress={() => setTab(value)}
              style={{
                paddingHorizontal: theme.spacing.lg,
                minHeight: 44,
                justifyContent: 'center',
                borderRadius: theme.radius.full,
                borderWidth: 1,
                borderColor:
                  tab === value ? theme.colors.accent : theme.colors.border,
              }}
            >
              <Text
                color={tab === value ? 'text' : 'textSecondary'}
                variant="footnote"
              >
                {t(`moderation.${value}`)}
              </Text>
            </Pressable>
          ))}
        </View>

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
        </View>

        <View style={{ marginTop: theme.spacing.xxxl }}>
          <Text color="textTertiary" variant="footnote">
            {t('moderation.everyDecisionLogged')}
          </Text>
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
    <View
      style={{
        paddingVertical: theme.spacing.lg,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
        gap: theme.spacing.sm,
      }}
    >
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
    </View>
  );
}
