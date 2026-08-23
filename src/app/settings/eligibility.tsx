import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Switch, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMyProfile, useUpdateProfile } from '@/features/profiles/hooks';
import {
  canToggleParticipation,
  isPermanent,
  type EligibilityReason,
} from '@/features/selection/eligibility';
import { useEligibility } from '@/features/selection/hooks';
import { useTheme } from '@/theme';

const REASON_KEYS: Record<EligibilityReason, string> = {
  'no-profile': 'eligibility.reasons.noProfile',
  'account-not-active': 'eligibility.reasons.accountNotActive',
  'opted-out': 'eligibility.reasons.optedOut',
  'not-verified': 'eligibility.reasons.notVerified',
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

  const permanent = eligibility.reasons.some(isPermanent);

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('eligibility.title') }}
      />
      <Screen>
        <Text variant="title3">
          {loading
            ? t('common.loading')
            : eligibility.eligible
              ? t('eligibility.inPool')
              : permanent
                ? t('eligibility.alreadyHad')
                : t('eligibility.notInPool')}
        </Text>

        <Text color="textSecondary" style={{ marginTop: theme.spacing.md }}>
          {eligibility.eligible
            ? t('eligibility.inPoolBody')
            : t('eligibility.notInPoolBody')}
        </Text>

        {!loading && eligibility.reasons.length > 0 ? (
          <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
            {eligibility.reasons.map((reason) => (
              <Text color="textSecondary" key={reason}>
                · {t(REASON_KEYS[reason])}
              </Text>
            ))}
          </View>
        ) : null}

        {/* The question anybody in the pool actually has, answered before the
            day it matters rather than in the twelve hours they have to decide. */}
        <View style={{ marginTop: theme.spacing.xl }}>
          <Link href="/if-you-are-chosen">
            <Text color="accent">{t('chosen.title')} →</Text>
          </Link>
        </View>

        {/* Article 5.6 — leaving costs nothing and grants nothing. */}
        {canToggleParticipation(profile ?? null) && !permanent ? (
          <View
            style={{
              marginTop: theme.spacing.xxl,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.lg,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text>{t('eligibility.participate')}</Text>
              <Text color="textTertiary" variant="footnote">
                {t('eligibility.participateHint')}
              </Text>
            </View>
            <Switch
              accessibilityLabel={t('eligibility.participate')}
              onValueChange={(value) => {
                updateProfile.mutate({ wants_selection: value });
              }}
              value={profile?.wants_selection ?? false}
            />
          </View>
        ) : null}

        <View style={{ marginTop: theme.spacing.xxxl }}>
          <Text color="textTertiary" variant="footnote">
            {t('eligibility.fairnessNote')}
          </Text>
        </View>
      </Screen>
    </>
  );
}
