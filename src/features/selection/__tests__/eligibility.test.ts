import type { ProfileRow } from '@/lib/supabase/types';

import {
  canToggleParticipation,
  daysUntilEligible,
  evaluateEligibility,
  isPermanent,
} from '../eligibility';

const NOW = new Date('2027-06-15T00:00:00.000Z');

/** A profile that satisfies every criterion. Tests break one thing at a time. */
const eligibleProfile: ProfileRow = {
  id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  username: 'aya',
  display_name: 'Aya',
  birth_year: 1995,
  country_code: 'JP',
  city: null,
  city_hidden: false,
  locale: 'en',
  languages: ['ja', 'en'],
  avatar_path: null,
  bio_short: null,
  selection_eligible: true,
  wants_selection: true,
  verification_level: 'device',
  assurance_level: 'device_attested',
  activity_requirement_met: true,
  review_pending: false,
  account_status: 'active',
  account_status_version: 0,
  accepted_rules_at: '2027-01-01T00:00:00.000Z',
  created_at: '2027-01-01T00:00:00.000Z',
  updated_at: '2027-01-01T00:00:00.000Z',
};

const evaluate = (
  overrides: Partial<ProfileRow> = {},
  hasBeenSelected = false
) =>
  evaluateEligibility({
    profile: { ...eligibleProfile, ...overrides },
    hasBeenSelected,
    now: NOW,
  });

describe('eligibility is binary', () => {
  it('admits a profile that meets every criterion', () => {
    expect(evaluate()).toEqual({ eligible: true, reasons: [] });
  });

  it('has no score, tier or partial state to express', () => {
    // The shape itself is the guarantee: a boolean and a list of reasons.
    const result = evaluate({ assurance_level: 'contact_pending' });
    expect(Object.keys(result).sort()).toEqual(['eligible', 'reasons']);
    expect(typeof result.eligible).toBe('boolean');
  });
});

describe('each criterion excludes on its own', () => {
  it('requires a profile at all', () => {
    expect(
      evaluateEligibility({ profile: null, hasBeenSelected: false })
    ).toEqual({ eligible: false, reasons: ['no-profile'] });
  });

  it.each(['suspended', 'banned', 'deletion_pending', 'deleted'] as const)(
    'excludes a %s account',
    (status) => {
      const result = evaluate({ account_status: status });
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('account-not-active');
    }
  );

  it('excludes someone who has opted out (Article 5.6)', () => {
    const result = evaluate({ wants_selection: false });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('opted-out');
  });

  it('excludes someone who has not accepted the rules', () => {
    expect(evaluate({ accepted_rules_at: null }).reasons).toContain(
      'rules-not-accepted'
    );
  });

  it('requires a stable Apple or Google provider identity', () => {
    expect(evaluate({ assurance_level: 'contact_verified' }).reasons).toContain(
      'provider-not-verified'
    );
  });

  it('requires a server-attested device', () => {
    expect(
      evaluate({ assurance_level: 'provider_verified' }).reasons
    ).toContain('device-not-attested');
  });

  it('requires genuine product activity', () => {
    expect(evaluate({ activity_requirement_met: false }).reasons).toContain(
      'activity-required'
    );
  });

  it('excludes unresolved duplicate signals pending review', () => {
    expect(evaluate({ review_pending: true }).reasons).toContain(
      'under-review'
    );
  });

  it('excludes someone the nightly pass has not admitted yet', () => {
    /*
     * This assertion used to expect 'not-verified' here, which is how the bug
     * survived: the test agreed with the code that not being in the pool and
     * not being verified were the same thing. They are not. This profile is
     * verified and months old — all that is missing is the refresh.
     */
    expect(evaluate({ selection_eligible: false }).reasons).toContain(
      'awaiting-refresh'
    );
  });

  it('excludes someone under 16 (Article 8.4)', () => {
    expect(evaluate({ birth_year: 2015 }).reasons).toContain('under-age');
  });

  it('admits someone exactly 16', () => {
    expect(evaluate({ birth_year: NOW.getUTCFullYear() - 16 }).eligible).toBe(
      true
    );
  });
});

describe('one human, one day, forever (Article 5.4)', () => {
  it('excludes anyone who has already been Today’s Human', () => {
    const result = evaluate({}, true);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('already-been-human');
  });

  it('excludes them even when everything else is perfect', () => {
    // There is no cooldown and no second turn, so no combination of other
    // criteria can put them back in the pool.
    expect(evaluate({}, true).eligible).toBe(false);
  });

  it('is the only permanent exclusion', () => {
    expect(isPermanent('already-been-human')).toBe(true);
    for (const reason of [
      'no-profile',
      'account-not-active',
      'opted-out',
      'provider-not-verified',
      'device-not-attested',
      'activity-required',
      'under-review',
      'rules-not-accepted',
      'under-age',
    ] as const) {
      expect(isPermanent(reason)).toBe(false);
    }
  });
});

describe('reporting several reasons at once', () => {
  it('lists every unmet criterion rather than only the first', () => {
    const result = evaluate({
      wants_selection: false,
      assurance_level: 'contact_verified',
      accepted_rules_at: null,
    });

    expect(result.reasons).toEqual([
      'opted-out',
      'rules-not-accepted',
      'provider-not-verified',
    ]);
  });
});

describe('leaving the pool', () => {
  it('is available to any active account (Article 5.6)', () => {
    expect(canToggleParticipation(eligibleProfile)).toBe(true);
  });

  it('is not offered to a banned account', () => {
    expect(
      canToggleParticipation({ ...eligibleProfile, account_status: 'banned' })
    ).toBe(false);
  });

  it('is not offered before there is a profile', () => {
    expect(canToggleParticipation(null)).toBe(false);
  });
});

/**
 * "We still need to confirm that you are a real person."
 *
 * That sentence was shown to anybody whose `selection_eligible` was false —
 * which is true of *every* account for its first seven days, verified or not.
 * So the first thing a new person read was that they had something left to
 * prove, when in fact they had only to wait. It is the message almost every
 * user meets in their first week, and it was wrong for almost all of them.
 *
 * Three situations, three answers.
 */
describe('waiting is not the same as missing assurance', () => {
  const dayOne = '2027-06-14T00:00:00.000Z';
  const longAgo = '2027-01-01T00:00:00.000Z';

  it('states precisely when only the contact is verified', () => {
    const result = evaluate({
      assurance_level: 'contact_verified',
      created_at: longAgo,
      selection_eligible: false,
    });
    expect(result.reasons).toContain('provider-not-verified');
    expect(result.reasons).not.toContain('account-too-new');
  });

  it('says too new when the account is verified but young', () => {
    const result = evaluate({
      assurance_level: 'device_attested',
      created_at: dayOne,
      selection_eligible: false,
    });
    expect(result.reasons).toContain('account-too-new');
    expect(result.reasons).not.toContain('provider-not-verified');
  });

  it('says awaiting the nightly pass when old enough and still not in', () => {
    // Verified, past seven days, but the refresh has not judged them yet. A
    // few hours at most, and nothing to act on.
    const result = evaluate({
      assurance_level: 'device_attested',
      created_at: longAgo,
      selection_eligible: false,
    });
    expect(result.reasons).toContain('awaiting-refresh');
    expect(result.reasons).not.toContain('provider-not-verified');
    expect(result.reasons).not.toContain('account-too-new');
  });

  it('never claims only a refresh is pending when a real blocker exists', () => {
    const missingProvider = evaluate({
      assurance_level: 'contact_verified',
      created_at: dayOne,
      selection_eligible: false,
    }).reasons;
    expect(missingProvider).toContain('provider-not-verified');
    expect(missingProvider).not.toContain('awaiting-refresh');

    const fullyReady = evaluate({
      assurance_level: 'device_attested',
      created_at: longAgo,
      selection_eligible: false,
    }).reasons;
    expect(fullyReady).toEqual(['awaiting-refresh']);
  });
});

describe('how much longer', () => {
  it('counts down whole days', () => {
    expect(
      daysUntilEligible(
        { ...eligibleProfile, created_at: '2027-06-14T00:00:00.000Z' },
        NOW
      )
    ).toBe(6);
  });

  it('never goes negative once the wait is over', () => {
    expect(
      daysUntilEligible(
        { ...eligibleProfile, created_at: '2020-01-01T00:00:00.000Z' },
        NOW
      )
    ).toBe(0);
  });
});
