import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import {
  useArchiveRemovalOptions,
  useRequestArchiveRemoval,
} from '@/features/privacy/hooks';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';
import { formatHumanNumber } from '@/utils/cycle';

export default function ArchiveRemovalScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const options = useArchiveRemovalOptions();
  const request = useRequestArchiveRemoval();
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('privacy.archiveRemoval') }}
      />
      <Screen>
        <PageHeader
          subtitle={t('privacy.archiveRemovalBody')}
          title={t('privacy.archiveRemoval')}
        />
        {options.isLoading ? (
          <Skeleton height={160} radius={theme.radius.xl} />
        ) : options.isError ? (
          <ErrorState
            error={toAppError(options.error)}
            onRetry={() => void options.refetch()}
          />
        ) : options.data && options.data.length > 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            {options.data.map((human) => (
              <Surface
                key={human.draw_id}
                tone="warm"
                style={{ gap: theme.spacing.md }}
              >
                <View
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <View>
                    <Text variant="mono">
                      {formatHumanNumber(human.human_number)}
                    </Text>
                    <Text color="textTertiary" variant="footnote">
                      {human.selection_date}
                    </Text>
                  </View>
                  {human.is_removed ? (
                    <Pill label={t('privacy.removed')} />
                  ) : human.request_status ? (
                    <Pill
                      label={t(
                        `privacy.removalStatuses.${human.request_status}`
                      )}
                    />
                  ) : null}
                </View>
                {!human.is_removed &&
                (!human.request_status ||
                  human.request_status === 'declined' ||
                  human.request_status === 'cancelled') ? (
                  selected === human.draw_id ? (
                    <View style={{ gap: theme.spacing.md }}>
                      <TextField
                        label={t('privacy.removalReason')}
                        hint={t('privacy.removalReasonHint')}
                        maxLength={1000}
                        multiline
                        onChangeText={setReason}
                        value={reason}
                      />
                      <Button
                        disabled={request.isPending}
                        label={t('privacy.confirmRemovalRequest')}
                        onPress={() =>
                          request.mutate([human.draw_id, reason], {
                            onSuccess: () => {
                              setSelected(null);
                              setReason('');
                            },
                          })
                        }
                        variant="danger"
                      />
                    </View>
                  ) : (
                    <Button
                      label={t('privacy.requestRemoval')}
                      onPress={() => {
                        setReason('');
                        setSelected(human.draw_id);
                      }}
                      variant="secondary"
                    />
                  )
                ) : null}
              </Surface>
            ))}
          </View>
        ) : (
          <EmptyState
            body={t('privacy.archiveRemovalEmptyBody')}
            icon="book-open"
            title={t('privacy.archiveRemovalEmpty')}
          />
        )}
      </Screen>
    </>
  );
}
