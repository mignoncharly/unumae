import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import {
  useCountryRepresentation,
  useSelectionStats,
  useUnnamedCountries,
} from '@/features/stats/hooks';
import { useTheme } from '@/theme';
import { countryName, flagEmoji } from '@/utils/country';

/**
 * The three numbers, in the shape the plan asked for:
 *
 *     1,042 Humans waiting
 *     43 countries
 *     137 languages
 *
 * It is the opposite of a vanity metric even though it looks like one. "1,042
 * users" would measure us; "1,042 people waiting for the same thing you are"
 * measures your odds, and it is the only number on which the product's central
 * claim can be checked.
 *
 * It will get less flattering as the product grows — one in fifty thousand is a
 * worse sentence than one in a thousand — and it stays on the page anyway.
 * Article 12 has no exception for numbers that stop helping.
 */
export function SelectionStats({ showOdds = true }: { showOdds?: boolean }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { data: stats, isLoading } = useSelectionStats();

  const format = (value: number) =>
    new Intl.NumberFormat(i18n.language).format(value);

  if (isLoading || !stats) {
    return null;
  }

  // Before anybody has joined there is nothing true to say, and a row of zeros
  // reads as a broken screen rather than an empty one.
  if (stats.waiting === 0) {
    return (
      <Text color="textTertiary" variant="footnote">
        {t('stats.empty')}
      </Text>
    );
  }

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="title2">
        {t('stats.waiting', {
          count: stats.waiting,
          formatted: format(stats.waiting),
        })}
      </Text>
      <Text color="textSecondary" variant="callout">
        {t('stats.countries', {
          count: stats.countries,
          formatted: format(stats.countries),
        })}
      </Text>
      <Text color="textSecondary" variant="callout">
        {t('stats.languages', {
          count: stats.languages,
          formatted: format(stats.languages),
        })}
      </Text>

      {showOdds ? (
        <Text
          color="textTertiary"
          style={{ marginTop: theme.spacing.sm }}
          variant="footnote"
        >
          {t('stats.odds', { formatted: format(stats.waiting) })}
        </Text>
      ) : null}

      {stats.humansPublished > 0 ? (
        <Text color="textTertiary" variant="footnote">
          {t('stats.published', {
            count: stats.humansPublished,
            formatted: format(stats.humansPublished),
            countries: format(stats.archiveCountries),
          })}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Which countries are waiting.
 *
 * Countries with fewer than five people are counted but never named — being
 * the only person waiting in a country means being identified the day you are
 * drawn. The remainder is printed underneath so the arithmetic still adds up: a
 * transparency page whose numbers do not reconcile teaches people to distrust
 * the ones that do.
 */
export function CountryRepresentation() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { data: countries } = useCountryRepresentation();
  const { data: unnamed } = useUnnamedCountries();

  if (!countries || countries.length === 0) {
    return null;
  }

  const format = (value: number) =>
    new Intl.NumberFormat(i18n.language).format(value);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {countries.map((entry) => (
        <View
          key={entry.countryCode}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
          }}
        >
          <Text color="textSecondary" style={{ flex: 1 }}>
            {flagEmoji(entry.countryCode)}{' '}
            {countryName(entry.countryCode, i18n.language)}
          </Text>
          <Text color="textTertiary" variant="mono">
            {format(entry.waiting)}
          </Text>
        </View>
      ))}

      {unnamed && unnamed.countries > 0 ? (
        <Text
          color="textTertiary"
          style={{ marginTop: theme.spacing.sm }}
          variant="footnote"
        >
          {t('stats.unnamed', {
            count: unnamed.countries,
            countries: format(unnamed.countries),
            people: format(unnamed.waiting),
          })}
        </Text>
      ) : null}
    </View>
  );
}
