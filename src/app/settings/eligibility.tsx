import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ListGroup, ListRow, SettingsSwitch } from '@/components/ui/ListGroup';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useDeviceAttestation } from '@/features/attestation/hooks';
import { useMyProfile, useUpdateProfile } from '@/features/profiles/hooks';
import {
  canToggleParticipation,
  isPermanent,
  type EligibilityReason,
} from '@/features/selection/eligibility';
import { useEligibility } from '@/features/selection/hooks';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

const REASON_KEYS: Record<EligibilityReason, string> = {
  'no-profile': 'eligibility.reasons.noProfile',
  'account-not-active': 'eligibility.reasons.accountNotActive',
  'opted-out': 'eligibility.reasons.optedOut',
  'provider-not-verified': 'eligibility.reasons.providerNotVerified',
  'device-not-attested': 'eligibility.reasons.deviceNotAttested',
  'activity-required': 'eligibility.reasons.activityRequired',
  'under-review': 'eligibility.reasons.underReview',
  'account-too-new': 'eligibility.reasons.accountTooNew',
  'awaiting-refresh': 'eligibility.reasons.awaitingRefresh',
  'rules-not-accepted': 'eligibility.reasons.rulesNotAccepted',
  'under-age': 'eligibility.reasons.underAge',
  'already-been-human': 'eligibility.reasons.alreadyBeenHuman',
};

/**
 * Article 12 — the product must be able to explain itself.
 *
 * "You are not eligible" with no reason is the opposite of transparency, so
 * every unmet criterion is listed, and the one permanent reason is presented as
 * what it is: not a rejection, but a turn already taken.
 */
export default function EligibilityScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const { eligibility, loading } = useEligibility();
  const updateProfile = useUpdateProfile();
  const { attest, requestReview } = useDeviceAttestation();
  const [mutationError, setMutationError] = useState<string>();

  const permanent = eligibility.reasons.some(isPermanent);

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('eligibility.title') }}
      />
      <Screen>
        <PageHeader
          subtitle={t('eligibility.fairnessNote')}
          title={t('eligibility.title')}
        />
        <Surface
          tone={eligibility.eligible ? 'accent' : 'warm'}
          style={{ gap: theme.spacing.md }}
        >
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: theme.spacing.md,
            }}
          >
            <Icon
              color={eligibility.eligible ? 'accent' : 'warning'}
              name={eligibility.eligible ? 'check-circle' : 'clock'}
              size={24}
            />
            <Text variant="title3" style={{ flex: 1, fontWeight: '600' }}>
              {loading
                ? t('common.loading')
                : eligibility.eligible
                  ? t('eligibility.inPool')
                  : permanent
                    ? t('eligibility.alreadyHad')
                    : t('eligibility.notInPool')}
            </Text>
          </View>

          <Text color="textSecondary">
            {eligibility.eligible
              ? t('eligibility.inPoolBody')
              : t('eligibility.notInPoolBody')}
          </Text>

          {!loading && eligibility.reasons.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              {eligibility.reasons.map((reason) => (
                <View
                  key={reason}
                  style={{ flexDirection: 'row', gap: theme.spacing.sm }}
                >
                  <Icon color="textTertiary" name="info" size={16} />
                  <Text color="textSecondary" style={{ flex: 1 }}>
                    {t(REASON_KEYS[reason])}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Surface>

        {eligibility.reasons.includes('device-not-attested') ||
        profile?.review_pending ? (
          <Surface
            tone="accent"
            style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}
          >
            <Text variant="title3">{t('attestation.title')}</Text>
            <Text color="textSecondary">
              {profile?.review_pending
                ? t('attestation.reviewPending')
                : attest.data?.state === 'development'
                  ? t('attestation.development')
                  : attest.data?.state === 'unsupported'
                    ? t('attestation.unsupported')
                    : t('attestation.body')}
            </Text>
            {attest.error ? (
              <Text color="danger" variant="footnote">
                {t(toAppError(attest.error).messageKey)}
              </Text>
            ) : null}
            {requestReview.error ? (
              <Text color="danger" variant="footnote">
                {t(toAppError(requestReview.error).messageKey)}
              </Text>
            ) : null}
            {!profile?.review_pending ? (
              <Button
                disabled={attest.isPending || requestReview.isPending}
                icon="shield"
                label={t('attestation.verify')}
                onPress={() => attest.mutate()}
              />
            ) : null}
            {!profile?.review_pending &&
            (attest.error || attest.data?.state === 'unsupported') ? (
              <Button
                disabled={requestReview.isPending}
                icon="users"
                label={t('attestation.requestReview')}
                onPress={() => requestReview.mutate()}
                variant="secondary"
              />
            ) : null}
          </Surface>
        ) : null}

        {/* The question anybody in the pool actually has, answered before the
            day it matters rather than in the twelve hours they have to decide. */}
        <View style={{ marginTop: theme.spacing.xl }}>
          <ListGroup>
            <ListRow
              first
              icon="award"
              onPress={() => router.push('/if-you-are-chosen')}
              title={t('chosen.title')}
            />
          </ListGroup>
        </View>

        {/* Article 5.6 — leaving costs nothing and grants nothing. */}
        {canToggleParticipation(profile ?? null) && !permanent ? (
          <View style={{ marginTop: theme.spacing.xl }}>
            <ListGroup>
              <ListRow
                first
                icon="globe"
                subtitle={t('eligibility.participateHint')}
                title={t('eligibility.participate')}
                trailing={
                  <SettingsSwitch
                    label={t('eligibility.participate')}
                    onValueChange={(value) => {
                      setMutationError(undefined);
                      updateProfile.mutate(
                        { wants_selection: value },
                        {
                          onError: (caught) =>
                            setMutationError(t(toAppError(caught).messageKey)),
                        }
                      );
                    }}
                    value={profile?.wants_selection ?? false}
                  />
                }
              />
            </ListGroup>
          </View>
        ) : null}
        {mutationError ? (
          <Text
            color="danger"
            variant="footnote"
            style={{ marginTop: theme.spacing.md }}
          >
            {mutationError}
          </Text>
        ) : null}
      </Screen>
    </>
  );
}
