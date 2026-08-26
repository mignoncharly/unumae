import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useBlockedUsers, useUnblock } from '@/features/privacy/hooks';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';
import { flagEmoji } from '@/utils/country';

export default function BlockedUsersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const blocked = useBlockedUsers();
  const unblock = useUnblock();

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('privacy.blockedUsers') }}
      />
      <Screen>
        <PageHeader
          subtitle={t('privacy.blockedUsersBody')}
          title={t('privacy.blockedUsers')}
        />
        {blocked.isLoading ? (
          <Skeleton height={120} radius={theme.radius.xl} />
        ) : blocked.isError ? (
          <ErrorState
            error={toAppError(blocked.error)}
            onRetry={() => void blocked.refetch()}
          />
        ) : blocked.data && blocked.data.length > 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            {blocked.data.map((person) => (
              <Surface key={person.block_id} style={{ gap: theme.spacing.md }}>
                <View
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: theme.spacing.md,
                  }}
                >
                  <Avatar name={person.display_name} size="md" />
                  <View style={{ flex: 1 }}>
                    <Text variant="callout" style={{ fontWeight: '600' }}>
                      {person.display_name}
                    </Text>
                    <Text color="textTertiary" variant="footnote">
                      {flagEmoji(person.country_code)} {person.country_code}
                    </Text>
                  </View>
                  <Button
                    disabled={unblock.isPending}
                    label={t('privacy.unblock')}
                    onPress={() => unblock.mutate(person.block_id)}
                    variant="secondary"
                  />
                </View>
              </Surface>
            ))}
          </View>
        ) : (
          <EmptyState
            body={t('privacy.blockedUsersEmptyBody')}
            icon="slash"
            title={t('privacy.blockedUsersEmpty')}
          />
        )}
        {unblock.isError ? (
          <Text color="danger" variant="footnote">
            {t(toAppError(unblock.error).messageKey)}
          </Text>
        ) : null}
      </Screen>
    </>
  );
}
