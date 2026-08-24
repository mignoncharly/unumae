import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ArchiveCard } from '@/components/archive/ArchiveCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import {
  useAnniversaries,
  useArchive,
  useArchiveCountries,
  useArchiveYears,
  useRememberedHumans,
  useRandomHuman,
  useYesterday,
} from '@/features/archive/hooks';
import { useIsAuthenticated } from '@/features/auth/useSession';
import { track } from '@/lib/analytics';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';
import { countryName, flagEmoji } from '@/utils/country';

/**
 * The Human Archive.
 *
 * Browsable by year, by country, and at random. Never by "most liked", "top
 * human", "viral" or "trending" — there is no control for it here because
 * there is no such ordering in the database to expose (Article 9.5).
 */
export default function ArchiveScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isAuthenticated = useIsAuthenticated();

  const [country, setCountry] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);

  const {
    data: archive,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useArchive({ country, year });
  const entries = archive?.pages.flat() ?? [];
  const { data: yesterday } = useYesterday();
  const remembered = useRememberedHumans(isAuthenticated);
  const rememberedEntries = remembered.data?.pages.flat() ?? [];
  const { data: anniversaries } = useAnniversaries();
  const { data: countries } = useArchiveCountries();
  const { data: years } = useArchiveYears();
  const randomHuman = useRandomHuman();

  useEffect(() => {
    track('archive_opened');
  }, []);

  function openHuman(drawId: string) {
    router.push(`/human/${drawId}`);
  }

  return (
    <Screen>
      <PageHeader
        eyebrow={t('common.tagline')}
        subtitle={t('archive.subtitle')}
        title={t('archive.title')}
      />

      <View style={{ gap: theme.spacing.md }}>
        <SectionHeader title={t('archive.yesterday')} />
        {yesterday ? (
          <ArchiveCard
            countryCode={yesterday.country_code}
            displayName={yesterday.display_name}
            humanNumber={yesterday.human_number}
            isRemoved={yesterday.is_removed}
            onPress={() => openHuman(yesterday.draw_id)}
            photoUrl={yesterday.photo_url}
            selectionDate={yesterday.selection_date}
          />
        ) : (
          <Text color="textTertiary">{t('archive.noYesterday')}</Text>
        )}
      </View>

      {isAuthenticated ? (
        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xxl }}>
          <SectionHeader
            caption={t('remember.private')}
            title={t('remember.library')}
          />
          {rememberedEntries.length > 0 ? (
            <>
              {rememberedEntries.slice(0, 3).map((entry) => (
                <ArchiveCard
                  countryCode={entry.country_code}
                  displayName={entry.display_name}
                  humanNumber={entry.human_number}
                  isRemoved={entry.is_removed}
                  key={entry.draw_id}
                  onPress={() => openHuman(entry.draw_id)}
                  photoUrl={entry.photo_url}
                  selectionDate={entry.selection_date}
                />
              ))}
              <Button
                label={t('remember.openLibrary')}
                onPress={() => router.push('/archive/remembered')}
                variant="secondary"
              />
            </>
          ) : remembered.isLoading ? (
            <Skeleton height={134} radius={theme.radius.xl} />
          ) : (
            <Text color="textTertiary">{t('remember.empty')}</Text>
          )}
        </View>
      ) : null}

      {/* One year ago today. Empty until the Archive is old enough to have one. */}
      {anniversaries && anniversaries.length > 0 ? (
        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xxl }}>
          <SectionHeader title={t('archive.oneYearAgo')} />
          {anniversaries.map((entry) => (
            <View key={entry.years_ago} style={{ gap: theme.spacing.xs }}>
              <Text color="textTertiary" variant="footnote">
                {t('archive.yearsAgo', {
                  count: entry.years_ago,
                }).toUpperCase()}
              </Text>
              <ArchiveCard
                countryCode={entry.country_code}
                displayName={entry.display_name}
                humanNumber={entry.human_number}
                isRemoved={entry.is_removed}
                onPress={() => openHuman(entry.draw_id)}
                photoUrl={entry.photo_url}
                selectionDate={entry.selection_date}
              />
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ marginTop: theme.spacing.xl }}>
        <Button
          disabled={randomHuman.isPending}
          icon="shuffle"
          label={t('archive.randomHuman')}
          onPress={() =>
            randomHuman.mutate(country, {
              onSuccess: (entry) => {
                if (entry) {
                  openHuman(entry.draw_id);
                }
              },
            })
          }
          variant="secondary"
        />
      </View>

      {/* Filters. Alphabetical and chronological — never ordered by count. */}
      {countries && countries.length > 0 ? (
        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
          <SectionHeader
            title={t('archive.explore')}
            caption={t('archive.exploreHint')}
          />
          <Text
            color="textTertiary"
            variant="caption"
            style={{ fontWeight: '700', letterSpacing: 1 }}
          >
            {t('archive.byCountry').toUpperCase()}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Chip
                label={t('archive.allCountries')}
                onPress={() => setCountry(null)}
                selected={country === null}
              />
              {countries.map((entry) => (
                <Chip
                  key={entry.country_code}
                  label={`${flagEmoji(entry.country_code)} ${countryName(
                    entry.country_code,
                    i18n.language
                  )}`}
                  onPress={() => setCountry(entry.country_code)}
                  selected={country === entry.country_code}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}

      {years && years.length > 0 ? (
        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.sm }}>
          <Text
            color="textTertiary"
            variant="caption"
            style={{ fontWeight: '700', letterSpacing: 1 }}
          >
            {t('archive.byYear').toUpperCase()}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Chip
                label={t('archive.allYears')}
                onPress={() => setYear(null)}
                selected={year === null}
              />
              {years.map((entry) => (
                <Chip
                  key={entry.year}
                  label={String(entry.year)}
                  onPress={() => setYear(entry.year)}
                  selected={year === entry.year}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}

      <View style={{ marginTop: theme.spacing.xxl }}>
        <SectionHeader title={t('archive.recent')} />
        <View style={{ marginTop: theme.spacing.lg }}>
          {isLoading ? (
            <View style={{ gap: theme.spacing.lg }}>
              <Skeleton height={134} radius={theme.radius.xl} />
              <Skeleton height={134} radius={theme.radius.xl} />
              <Skeleton height={134} radius={theme.radius.xl} />
            </View>
          ) : isError ? (
            <ErrorState
              error={toAppError(error)}
              onRetry={() => void refetch()}
            />
          ) : entries.length > 0 ? (
            entries.map((entry) => (
              <ArchiveCard
                countryCode={entry.country_code}
                displayName={entry.display_name}
                humanNumber={entry.human_number}
                isRemoved={entry.is_removed}
                key={entry.draw_id}
                onPress={() => openHuman(entry.draw_id)}
                photoUrl={entry.photo_url}
                selectionDate={entry.selection_date}
              />
            ))
          ) : (
            <EmptyState
              {...(country || year ? { body: t('archive.noMatchBody') } : {})}
              title={
                country || year ? t('archive.noMatch') : t('archive.empty')
              }
            />
          )}
          {hasNextPage ? (
            <View style={{ marginTop: theme.spacing.lg }}>
              <Button
                disabled={isFetchingNextPage}
                label={
                  isFetchingNextPage
                    ? t('common.loading')
                    : t('archive.loadOlder')
                }
                onPress={() => void fetchNextPage()}
                variant="secondary"
              />
            </View>
          ) : entries.length > 0 ? (
            <Text
              color="textTertiary"
              style={{ marginTop: theme.spacing.xl, textAlign: 'center' }}
              variant="footnote"
            >
              {t('archive.end')}
            </Text>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return <Pill label={label} onPress={onPress} selected={selected} />;
}
