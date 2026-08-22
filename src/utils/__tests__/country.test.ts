import { countryName, flagEmoji, formatOrigin } from '../country';

describe('flagEmoji', () => {
  it('builds a flag from regional indicator symbols', () => {
    expect(flagEmoji('JP')).toBe('🇯🇵');
    expect(flagEmoji('CM')).toBe('🇨🇲');
    expect(flagEmoji('BR')).toBe('🇧🇷');
  });

  it('accepts lowercase', () => {
    expect(flagEmoji('jp')).toBe(flagEmoji('JP'));
  });

  it('returns nothing for anything that is not an alpha-2 code', () => {
    // Degrading to no flag beats rendering tofu boxes at 8 billion people.
    expect(flagEmoji('')).toBe('');
    expect(flagEmoji('JPN')).toBe('');
    expect(flagEmoji('J1')).toBe('');
    expect(flagEmoji('  ')).toBe('');
  });

  it('produces two code points, one per letter', () => {
    expect([...flagEmoji('DE')]).toHaveLength(2);
  });
});

describe('countryName', () => {
  it('names a country, or falls back to its code', () => {
    // Intl.DisplayNames is not guaranteed on every engine build, so both the
    // localised name and the bare code are acceptable — never a throw.
    expect(['Japan', 'JP']).toContain(countryName('JP', 'en'));
  });

  it('returns nothing for an invalid code', () => {
    expect(countryName('XYZ')).toBe('');
  });

  it('never throws, whatever the locale', () => {
    expect(() => countryName('JP', 'not-a-locale')).not.toThrow();
  });
});

describe('formatOrigin', () => {
  it('omits the city when it is hidden or absent (Article 8.2)', () => {
    const withCity = formatOrigin('JP', 'Kyoto', 'en');
    const withoutCity = formatOrigin('JP', null, 'en');

    expect(withCity.startsWith('Kyoto, ')).toBe(true);
    expect(withoutCity).not.toContain(',');
    expect(withoutCity).toBe(countryName('JP', 'en'));
  });

  it('treats an empty city as no city', () => {
    expect(formatOrigin('JP', '', 'en')).toBe(countryName('JP', 'en'));
  });
});
