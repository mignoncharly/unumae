import type { ProfileRow } from '@/lib/supabase/types';

import {
  canToggleParticipation,
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
  languages: ['ja', 'en'],
  avatar_path: null,
  bio_short: null,
  selection_eligible: true,
  wants_selection: true,
  verification_level: 'device',
  account_status: 'active',
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
    const result = evaluate({ verification_level: 'none' });
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

  it.each(['suspended', 'banned', 'deleted'] as const)(
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

  it('excludes someone unverified (Article 8.5)', () => {
    expect(evaluate({ verification_level: 'none' }).reasons).toContain(
      'not-verified'
    );
    expect(evaluate({ selection_eligible: false }).reasons).toContain(
      'not-verified'
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
      'not-verified',
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
      verification_level: 'none',
      accepted_rules_at: null,
    });

    expect(result.reasons).toEqual([
      'opted-out',
      'rules-not-accepted',
      'not-verified',
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
