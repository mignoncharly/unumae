import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ArchiveCard } from '@/components/archive/ArchiveCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useRememberedHumans } from '@/features/archive/hooks';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

export default function RememberedHumansScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const query = useRememberedHumans();
  const entries = query.data?.pages.flat() ?? [];

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('remember.library') }}
      />
      <Screen>
        <PageHeader
          eyebrow={t('remember.private')}
          subtitle={t('remember.libraryBody')}
          title={t('remember.library')}
        />

        {query.isLoading ? (
          <View style={{ gap: theme.spacing.md }}>
            <Skeleton height={134} radius={theme.radius.xl} />
            <Skeleton height={134} radius={theme.radius.xl} />
            <Skeleton height={134} radius={theme.radius.xl} />
          </View>
        ) : query.isError ? (
          <ErrorState
            error={toAppError(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : entries.length === 0 ? (
          <EmptyState
            action={{
              label: t('remember.exploreArchive'),
              onPress: () => router.replace('/archive'),
            }}
            body={t('remember.emptyBody')}
            icon="bookmark"
            title={t('remember.empty')}
          />
        ) : (
          <>
            {entries.map((entry) => (
              <ArchiveCard
                countryCode={entry.country_code}
                displayName={entry.display_name}
                humanNumber={entry.human_number}
                isRemoved={entry.is_removed}
                key={entry.draw_id}
                onPress={() => router.push(`/human/${entry.draw_id}`)}
                photoUrl={entry.photo_url}
                selectionDate={entry.selection_date}
              />
            ))}
            {query.hasNextPage ? (
              <Button
                disabled={query.isFetchingNextPage}
                label={
                  query.isFetchingNextPage
                    ? t('common.loading')
                    : t('archive.loadOlder')
                }
                onPress={() => void query.fetchNextPage()}
                variant="secondary"
              />
            ) : (
              <Text
                color="textTertiary"
                style={{ marginTop: theme.spacing.lg, textAlign: 'center' }}
                variant="footnote"
              >
                {t('archive.end')}
              </Text>
            )}
          </>
        )}
      </Screen>
    </>
  );
}
