import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
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
import { TextField } from '@/components/ui/TextField';
import { Toast } from '@/components/ui/Toast';
import { signArchivePhoto } from '@/features/archive/api';
import {
  useAmIModerator,
  useAccountAssuranceReviewQueue,
  useAppealQueue,
  useArchiveRemovalQueue,
  useModerationActions,
  usePortraitQueue,
  useQuestionQueue,
  useReportQueue,
} from '@/features/moderation/hooks';
import type { Json } from '@/lib/supabase/types';
import { useTheme } from '@/theme';
import { formatHumanNumber } from '@/utils/cycle';

type Tab =
  | 'portraits'
  | 'questions'
  | 'reports'
  | 'assurance'
  | 'appeals'
  | 'removals'
  | 'signals'
  | 'operations';

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
  const { data: assuranceReviews } = useAccountAssuranceReviewQueue(
    enabled && tab === 'assurance'
  );
  const { data: appeals } = useAppealQueue(enabled && tab === 'appeals');
  const { data: removals } = useArchiveRemovalQueue(
    enabled && tab === 'removals'
  );
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
                'assurance',
                'appeals',
                'removals',
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
                <PortraitQueueItem
                  busy={actions.portrait.isPending}
                  key={item.portrait_id}
                  photoPath={item.photo_path}
                  responses={item.responses}
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
                    actions.portrait.mutate([item.portrait_id, 'approved'], {
                      onError: () => setToast(t('moderation.actionFailed')),
                      onSuccess: () => setToast(t('moderation.approved')),
                    });
                  }}
                  onReject={() => {
                    actions.portrait.mutate([item.portrait_id, 'rejected'], {
                      onError: () => setToast(t('moderation.actionFailed')),
                      onSuccess: () => setToast(t('moderation.rejected')),
                    });
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
                  busy={actions.question.isPending}
                  key={item.question_id}
                  meta={
                    item.auto_flags
                      ? `${item.author_display_name} · ${t('moderation.autoFlagged')}: ${item.auto_flags}`
                      : `${item.author_display_name} · ${t('moderation.noFlags')}`
                  }
                  onApprove={() => {
                    actions.question.mutate([item.question_id, 'approved'], {
                      onError: () => setToast(t('moderation.actionFailed')),
                      onSuccess: () => setToast(t('moderation.approved')),
                    });
                  }}
                  onReject={() => {
                    actions.question.mutate([item.question_id, 'rejected'], {
                      onError: () => setToast(t('moderation.actionFailed')),
                      onSuccess: () => setToast(t('moderation.rejected')),
                    });
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
                  busy={actions.report.isPending}
                  key={item.report_id}
                  meta={`${item.target_type} · ${item.created_at.slice(0, 10)}${
                    item.note ? ` · ${item.note}` : ''
                  }`}
                  onApprove={() => {
                    actions.report.mutate([item.report_id, ['dismiss']], {
                      onError: () => setToast(t('moderation.actionFailed')),
                      onSuccess: () => setToast(t('moderation.dismissed')),
                    });
                  }}
                  onReject={() => {
                    actions.report.mutate(
                      [
                        item.report_id,
                        item.target_type === 'profile'
                          ? ['suspend_account']
                          : ['remove_content'],
                      ],
                      {
                        onError: () => setToast(t('moderation.actionFailed')),
                        onSuccess: () => setToast(t('moderation.actioned')),
                      }
                    );
                  }}
                  rejectLabel={t(
                    item.target_type === 'profile'
                      ? 'moderation.suspendAccount'
                      : 'moderation.removeContent'
                  )}
                  title={
                    item.target_content ?? t(`report.reasons.${item.reason}`)
                  }
                >
                  {item.target_photo_path ? (
                    <ModerationPhoto
                      accessibilityLabel={t('moderation.reportedPhoto')}
                      path={item.target_photo_path}
                    />
                  ) : null}
                  <Text color="textSecondary" variant="footnote">
                    {t(`report.reasons.${item.reason}`)} ·{' '}
                    {item.subject_display_name ??
                      t('moderation.deletedSubject')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                    {item.target_type !== 'profile' ? (
                      <Button
                        disabled={actions.report.isPending}
                        label={t('moderation.removeAndSuspend')}
                        onPress={() => {
                          actions.report.mutate(
                            [
                              item.report_id,
                              ['remove_content', 'suspend_account'],
                            ],
                            {
                              onError: () =>
                                setToast(t('moderation.actionFailed')),
                              onSuccess: () =>
                                setToast(t('moderation.actioned')),
                            }
                          );
                        }}
                        style={{ flex: 1 }}
                        variant="secondary"
                      />
                    ) : null}
                    <Button
                      disabled={actions.report.isPending}
                      label={t(
                        item.target_type === 'profile'
                          ? 'moderation.banAccount'
                          : 'moderation.removeAndBan'
                      )}
                      onPress={() => {
                        actions.report.mutate(
                          [
                            item.report_id,
                            item.target_type === 'profile'
                              ? ['ban_account']
                              : ['remove_content', 'ban_account'],
                          ],
                          {
                            onError: () =>
                              setToast(t('moderation.actionFailed')),
                            onSuccess: () => setToast(t('moderation.actioned')),
                          }
                        );
                      }}
                      style={{ flex: 1 }}
                      variant="danger"
                    />
                  </View>
                </QueueItem>
              ))
            ) : (
              <EmptyState title={t('moderation.queueEmpty')} />
            )
          ) : null}

          {tab === 'assurance' ? (
            assuranceReviews && assuranceReviews.length > 0 ? (
              assuranceReviews.map((item) => (
                <AccountAssuranceQueueItem
                  busy={actions.assurance.isPending}
                  dueAt={item.review_due_at}
                  key={item.flag_id}
                  onDecision={(decision, note) => {
                    actions.assurance.mutate([item.flag_id, decision, note], {
                      onError: () => setToast(t('moderation.actionFailed')),
                      onSuccess: () =>
                        setToast(
                          t(
                            decision === 'cleared'
                              ? 'moderation.assuranceCleared'
                              : 'moderation.assuranceUpheld'
                          )
                        ),
                    });
                  }}
                  context={item.review_context}
                  signal={item.signal_kind}
                  title={item.display_name}
                />
              ))
            ) : (
              <EmptyState title={t('moderation.queueEmpty')} />
            )
          ) : null}

          {tab === 'appeals' ? (
            appeals && appeals.length > 0 ? (
              appeals.map((item) => (
                <QueueItem
                  approveLabel={t('moderation.uphold')}
                  busy={actions.appeal.isPending}
                  key={item.appeal_id}
                  meta={`${item.appellant_display_name ?? t('moderation.deletedSubject')} · ${item.original_reason ?? t('moderation.noReason')}`}
                  onApprove={() => {
                    actions.appeal.mutate([item.appeal_id, false], {
                      onError: () => setToast(t('moderation.actionFailed')),
                      onSuccess: () => setToast(t('moderation.upheld')),
                    });
                  }}
                  onReject={() => {
                    actions.appeal.mutate([item.appeal_id, true], {
                      onError: () => setToast(t('moderation.actionFailed')),
                      onSuccess: () => setToast(t('moderation.overturned')),
                    });
                  }}
                  rejectLabel={t('moderation.overturn')}
                  title={item.statement}
                />
              ))
            ) : (
              <EmptyState title={t('moderation.queueEmpty')} />
            )
          ) : null}

          {tab === 'removals' ? (
            removals && removals.length > 0 ? (
              removals.map((item) => (
                <QueueItem
                  approveLabel={t('moderation.approveRemoval')}
                  busy={actions.removal.isPending}
                  key={item.request_id}
                  meta={`${formatHumanNumber(item.human_number)} · ${item.selection_date}`}
                  onApprove={() => {
                    actions.removal.mutate([item.request_id, true], {
                      onError: () => setToast(t('moderation.actionFailed')),
                      onSuccess: () => setToast(t('moderation.approved')),
                    });
                  }}
                  onReject={() => {
                    actions.removal.mutate([item.request_id, false], {
                      onError: () => setToast(t('moderation.actionFailed')),
                      onSuccess: () => setToast(t('moderation.rejected')),
                    });
                  }}
                  title={item.reason ?? t('moderation.noReason')}
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

function AccountAssuranceQueueItem({
  title,
  signal,
  context,
  dueAt,
  busy,
  onDecision,
}: {
  title: string;
  signal: string;
  context: string | null;
  dueAt: string;
  busy: boolean;
  onDecision: (decision: 'cleared' | 'upheld', note: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const noteValid = note.trim().length >= 10;

  return (
    <Surface style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
      <Text variant="callout">{title}</Text>
      <Text color="textTertiary" variant="footnote">
        {t('moderation.assuranceSignal', {
          signal,
          due: dueAt.slice(0, 10),
        })}
      </Text>
      {context ? <Text color="textSecondary">{context}</Text> : null}
      <TextField
        label={t('moderation.assuranceReviewNote')}
        hint={t('moderation.assuranceReviewNoteHint')}
        maxLength={1000}
        multiline
        onChangeText={setNote}
        value={note}
      />
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Button
          disabled={busy || !noteValid}
          label={t('moderation.clearFlag')}
          onPress={() => onDecision('cleared', note.trim())}
          style={{ flex: 1 }}
        />
        <Button
          disabled={busy || !noteValid}
          label={t('moderation.upholdFlag')}
          onPress={() => onDecision('upheld', note.trim())}
          style={{ flex: 1 }}
          variant="secondary"
        />
      </View>
    </Surface>
  );
}

function QueueItem({
  title,
  meta,
  onApprove,
  onReject,
  approveLabel,
  rejectLabel,
  busy = false,
  children,
}: {
  title: string;
  meta: string;
  onApprove: () => void;
  onReject: () => void;
  approveLabel?: string;
  rejectLabel?: string;
  busy?: boolean;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Surface style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
      <Text variant="callout">{title}</Text>
      <Text color="textTertiary" variant="footnote">
        {meta}
      </Text>
      {children}
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Button
          disabled={busy}
          label={approveLabel ?? t('moderation.approve')}
          onPress={onApprove}
          style={{ flex: 1 }}
        />
        <Button
          disabled={busy}
          label={rejectLabel ?? t('moderation.reject')}
          onPress={onReject}
          style={{ flex: 1 }}
          variant="secondary"
        />
      </View>
    </Surface>
  );
}

function PortraitQueueItem({
  photoPath,
  responses,
  ...props
}: Parameters<typeof QueueItem>[0] & {
  photoPath: string | null;
  responses: Json;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void signArchivePhoto(photoPath).then((url) => {
      if (active) setPhotoUrl(url);
    });
    return () => {
      active = false;
    };
  }, [photoPath]);

  const answers = Array.isArray(responses)
    ? responses.filter(
        (value): value is { element_key: string; answer: string } =>
          typeof value === 'object' &&
          value !== null &&
          'element_key' in value &&
          typeof value.element_key === 'string' &&
          'answer' in value &&
          typeof value.answer === 'string'
      )
    : [];

  return (
    <QueueItem {...props}>
      {photoUrl ? (
        <Image
          accessibilityLabel={props.title}
          cachePolicy="memory-disk"
          contentFit="cover"
          source={{ uri: photoUrl }}
          style={{
            aspectRatio: 4 / 5,
            borderRadius: theme.radius.lg,
            width: '100%',
          }}
        />
      ) : null}
      {answers.map((answer) => (
        <View key={answer.element_key} style={{ gap: theme.spacing.xs }}>
          <Text color="accent" variant="caption">
            {t(`portrait.prompts.${answer.element_key}.label`)}
          </Text>
          <Text color="textSecondary">{answer.answer}</Text>
        </View>
      ))}
    </QueueItem>
  );
}

function ModerationPhoto({
  path,
  accessibilityLabel,
}: {
  path: string;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void signArchivePhoto(path).then((signed) => {
      if (active) setUrl(signed);
    });
    return () => {
      active = false;
    };
  }, [path]);

  return url ? (
    <Image
      accessibilityLabel={accessibilityLabel}
      cachePolicy="memory-disk"
      contentFit="cover"
      source={{ uri: url }}
      style={{
        aspectRatio: 4 / 5,
        borderRadius: theme.radius.lg,
        width: '100%',
      }}
    />
  ) : null;
}
