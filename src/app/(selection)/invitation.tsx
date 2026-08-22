import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import {
  formatTimeLeft,
  timeLeftToAccept,
  type InvitationTimeLeft,
} from '@/features/selection/invitation';
import {
  usePendingInvitation,
  useAnswerInvitation,
} from '@/features/selection/invitationApi';
import { track } from '@/lib/analytics';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

/**
 * "You were selected."
 *
 * Not "You are Today's Human" — that comes two days later, after the portrait
 * is written and reviewed. Saying it now would be a promise the product has
 * not yet kept, and would make declining feel like breaking something.
 *
 * Declining is one tap and costs nothing (Article 5.6). Nothing on this screen
 * pressures, counts down aggressively, or implies a lost opportunity.
 */
export default function InvitationScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: invitation, isLoading } = usePendingInvitation();
  const { accept, decline } = useAnswerInvitation();

  const [error, setError] = useState<string>();
  // Only a re-render trigger. The remaining time is derived below rather than
  // mirrored into state, so there is nothing to keep in sync.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!invitation) {
      return;
    }

    // Half-minute ticks: the window is twelve hours, so a second-by-second
    // countdown would only add pressure.
    const interval = setInterval(() => setTick((value) => value + 1), 30_000);
    return () => clearInterval(interval);
  }, [invitation]);

  const left: InvitationTimeLeft | null = invitation
    ? timeLeftToAccept(invitation.acceptanceDeadline)
    : null;

  if (isLoading) {
    return (
      <Screen>
        <Text color="textSecondary">{t('common.loading')}</Text>
      </Screen>
    );
  }

  if (!invitation) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <Screen>
          <EmptyState
            body={t('invitation.noneBody')}
            title={t('invitation.none')}
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <Screen>
        <Text variant="display">{t('invitation.title')}</Text>

        <Text
          color="textSecondary"
          style={{ marginTop: theme.spacing.lg }}
          variant="callout"
        >
          {t('invitation.body', { date: invitation.selectionDate })}
        </Text>

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.sm }}>
          <Text color="textTertiary" variant="footnote">
            {t('invitation.windowLabel').toUpperCase()}
          </Text>
          <Text
            color={left?.urgent ? 'danger' : 'textSecondary'}
            variant="mono"
          >
            {left ? formatTimeLeft(left) : '—'}
          </Text>
          <Text color="textTertiary" variant="footnote">
            {t('invitation.windowHint')}
          </Text>
        </View>

        <View style={{ marginTop: theme.spacing.xxxl, gap: theme.spacing.md }}>
          <Button
            disabled={accept.isPending || (left?.expired ?? false)}
            label={t('invitation.accept')}
            onPress={() => {
              setError(undefined);
              accept.mutate(undefined, {
                onSuccess: () => {
                  track('selection_accepted');
                  router.replace('/');
                },
                onError: (caught) => setError(t(toAppError(caught).messageKey)),
              });
            }}
          />

          <Button
            disabled={decline.isPending}
            label={t('invitation.decline')}
            onPress={() => {
              setError(undefined);
              decline.mutate(undefined, {
                onSuccess: () => {
                  track('selection_declined');
                  router.replace('/');
                },
                onError: (caught) => setError(t(toAppError(caught).messageKey)),
              });
            }}
            variant="secondary"
          />

          {error ? (
            <Text color="danger" variant="footnote">
              {error}
            </Text>
          ) : null}
        </View>

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
          <Text color="textTertiary" variant="footnote">
            {t('invitation.declineNote')}
          </Text>
          <Text color="textTertiary" variant="footnote">
            {t('invitation.whatHappensNext')}
          </Text>
        </View>
      </Screen>
    </>
  );
}
