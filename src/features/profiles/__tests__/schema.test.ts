import { MIN_ACCOUNT_AGE } from '@/constants/constitution';

import {
  birthYearSchema,
  countryCodeSchema,
  createProfileSchema,
  updateProfileSchema,
  usernameSchema,
} from '../schema';

const THIS_YEAR = new Date().getUTCFullYear();

describe('birth year', () => {
  it('accepts someone exactly at the minimum age (Article 8.4)', () => {
    expect(birthYearSchema.safeParse(THIS_YEAR - MIN_ACCOUNT_AGE).success).toBe(
      true
    );
  });

  it('rejects someone one year under', () => {
    expect(
      birthYearSchema.safeParse(THIS_YEAR - MIN_ACCOUNT_AGE + 1).success
    ).toBe(false);
  });

  it('rejects an implausible year rather than trusting arithmetic', () => {
    expect(birthYearSchema.safeParse(1200).success).toBe(false);
    expect(birthYearSchema.safeParse(THIS_YEAR + 5).success).toBe(false);
  });

  it('rejects a non-integer', () => {
    expect(birthYearSchema.safeParse(1990.5).success).toBe(false);
  });
});

describe('username', () => {
  it('accepts lowercase, digits and underscores', () => {
    expect(usernameSchema.parse('aya_128')).toBe('aya_128');
  });

  it('lowercases what the user typed', () => {
    expect(usernameSchema.parse('AYA')).toBe('aya');
  });

  it('rejects anything the database constraint would reject', () => {
    for (const invalid of ['ab', 'a'.repeat(21), 'aya-128', 'aya 128', 'ayá']) {
      expect(usernameSchema.safeParse(invalid).success).toBe(false);
    }
  });
});

describe('country code', () => {
  it('uppercases a two-letter code', () => {
    expect(countryCodeSchema.parse('jp')).toBe('JP');
  });

  it('rejects a three-letter code', () => {
    expect(countryCodeSchema.safeParse('JPN').success).toBe(false);
  });

  it('rejects a made-up two-letter code', () => {
    expect(countryCodeSchema.safeParse('XX').success).toBe(false);
  });
});

describe('createProfileSchema', () => {
  const valid = {
    username: 'aya',
    display_name: 'Aya',
    birth_year: THIS_YEAR - 30,
    country_code: 'JP',
    locale: 'en' as const,
    wants_selection: false,
  };

  it('requires four identity fields plus explicit locale and participation', () => {
    expect(createProfileSchema.safeParse(valid).success).toBe(true);
    const { wants_selection: _choice, ...withoutChoice } = valid;
    expect(createProfileSchema.safeParse(withoutChoice).success).toBe(false);
  });

  it('treats the city as optional and keeps it that way (Article 8.2)', () => {
    expect(
      createProfileSchema.safeParse({ ...valid, city: null }).success
    ).toBe(true);
    expect(
      createProfileSchema.safeParse({ ...valid, city: 'Kyoto' }).success
    ).toBe(true);
  });

  it('caps the bio at 160 characters', () => {
    expect(
      createProfileSchema.safeParse({ ...valid, bio_short: 'x'.repeat(161) })
        .success
    ).toBe(false);
  });

  it('rejects a profile for someone under 16', () => {
    expect(
      createProfileSchema.safeParse({ ...valid, birth_year: THIS_YEAR - 10 })
        .success
    ).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('cannot change the birth year — the age gate is not editable', () => {
    const parsed = updateProfileSchema.parse({
      display_name: 'Aya',
      birth_year: THIS_YEAR - 5,
    } as never);

    expect(parsed).not.toHaveProperty('birth_year');
  });

  it('allows a partial update', () => {
    expect(updateProfileSchema.safeParse({ city: null }).success).toBe(true);
  });
});
