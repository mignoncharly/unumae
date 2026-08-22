/**
 * Country display helpers.
 *
 * Article 8.2 — country is sufficient and city is never required. The country
 * is therefore the only place a Human is situated, which makes it worth
 * rendering well.
 */

const ISO_ALPHA_2 = /^[A-Za-z]{2}$/;
/** Regional indicator symbols start here; 'A' is 0x1F1E6. */
const REGIONAL_INDICATOR_BASE = 0x1f1e6;
const LETTER_A = 'A'.charCodeAt(0);

/**
 * `JP` → 🇯🇵. Built from regional indicator symbols rather than a lookup table,
 * so every country works and nothing needs maintaining.
 *
 * Returns an empty string for anything that is not an alpha-2 code, so a bad
 * value degrades to no flag rather than to tofu boxes.
 */
export function flagEmoji(countryCode: string): string {
  if (!ISO_ALPHA_2.test(countryCode)) {
    return '';
  }

  return [...countryCode.toUpperCase()]
    .map((letter) =>
      String.fromCodePoint(
        REGIONAL_INDICATOR_BASE + letter.charCodeAt(0) - LETTER_A
      )
    )
    .join('');
}

/**
 * `JP` → "Japan" / "Japon" / "Japan", localised to the viewer.
 *
 * Intl.DisplayNames is not guaranteed on every JS engine build, so an
 * unsupported runtime falls back to the uppercase code rather than throwing.
 */
export function countryName(countryCode: string, locale = 'en'): string {
  if (!ISO_ALPHA_2.test(countryCode)) {
    return '';
  }

  const code = countryCode.toUpperCase();

  try {
    const display = new Intl.DisplayNames([locale], { type: 'region' });
    return display.of(code) ?? code;
  } catch {
    return code;
  }
}

/** "Kyoto, Japan" or just "Japan" when the city is hidden or absent. */
export function formatOrigin(
  countryCode: string,
  city: string | null | undefined,
  locale = 'en'
): string {
  const country = countryName(countryCode, locale);
  return city ? `${city}, ${country}` : country;
}
