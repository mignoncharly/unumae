import { MIN_ACCOUNT_AGE } from '@/constants/constitution';
import { MIN_ACCOUNT_AGE_DAYS } from '@/constants/verification';
import type { ProfileRow } from '@/lib/supabase/types';

/**
 * The client's mirror of `public.is_eligible`.
 *
 * The database decides; this exists so a user can be told *why* rather than
 * just "no". Article 12 requires the product to explain itself, and "you are
 * not eligible" with no reason is the opposite of that.
 *
 * Every criterion below is binary. There is no score, no tier and no partial
 * eligibility — Article 5.1 makes sure "more eligible" is not a thing that can
 * be expressed here.
 */
export type EligibilityReason =
  | 'no-profile'
  | 'account-not-active'
  | 'opted-out'
  | 'provider-not-verified'
  | 'device-not-attested'
  | 'activity-required'
  | 'under-review'
  | 'account-too-new'
  | 'awaiting-refresh'
  | 'rules-not-accepted'
  | 'under-age'
  | 'already-been-human';

export interface Eligibility {
  eligible: boolean;
  /** Empty when eligible. Ordered as the user should read them. */
  reasons: EligibilityReason[];
}

export interface EligibilityContext {
  profile: ProfileRow | null;
  /** Article 5.4 — one human, one day, forever. */
  hasBeenSelected: boolean;
  /** Injected so the test does not depend on the day it runs. */
  now?: Date;
}

function accountAgeInDays(profile: ProfileRow, now: Date): number {
  const created = new Date(profile.created_at).getTime();
  return (now.getTime() - created) / 86_400_000;
}

/** Whole days left before the pool opens, never negative. */
export function daysUntilEligible(
  profile: ProfileRow | null,
  now: Date = new Date()
): number {
  if (!profile) {
    return MIN_ACCOUNT_AGE_DAYS;
  }
  return Math.max(
    0,
    Math.ceil(MIN_ACCOUNT_AGE_DAYS - accountAgeInDays(profile, now))
  );
}

export function evaluateEligibility({
  profile,
  hasBeenSelected,
  now = new Date(),
}: EligibilityContext): Eligibility {
  if (!profile) {
    return { eligible: false, reasons: ['no-profile'] };
  }

  const reasons: EligibilityReason[] = [];

  if (profile.account_status !== 'active') {
    reasons.push('account-not-active');
  }

  // The user's own choice comes first among the remaining reasons: if they
  // opted out, that is the answer, not a list of things to fix.
  if (!profile.wants_selection) {
    reasons.push('opted-out');
  }

  if (profile.accepted_rules_at === null) {
    reasons.push('rules-not-accepted');
  }

  if (
    profile.assurance_level === 'contact_pending' ||
    profile.assurance_level === 'contact_verified'
  ) {
    reasons.push('provider-not-verified');
  } else if (profile.assurance_level === 'provider_verified') {
    reasons.push('device-not-attested');
  }

  if (!profile.activity_requirement_met) {
    reasons.push('activity-required');
  }
  if (profile.review_pending) {
    reasons.push('under-review');
  }

  if (accountAgeInDays(profile, now) < MIN_ACCOUNT_AGE_DAYS) {
    reasons.push('account-too-new');
  } else if (
    !profile.selection_eligible &&
    !reasons.some((reason) =>
      [
        'provider-not-verified',
        'device-not-attested',
        'activity-required',
        'under-review',
      ].includes(reason)
    )
  ) {
    reasons.push('awaiting-refresh');
  }

  if (now.getUTCFullYear() - profile.birth_year < MIN_ACCOUNT_AGE) {
    reasons.push('under-age');
  }

  if (hasBeenSelected) {
    reasons.push('already-been-human');
  }

  return { eligible: reasons.length === 0, reasons };
}

/**
 * Being told "no" for a reason you can act on is different from being told
 * "no" forever. Only one reason here is permanent, and it is the good one.
 */
export function isPermanent(reason: EligibilityReason): boolean {
  return reason === 'already-been-human';
}

/** The one thing a user can change directly from this screen (Article 5.6). */
export function canToggleParticipation(profile: ProfileRow | null): boolean {
  return profile !== null && profile.account_status === 'active';
}
