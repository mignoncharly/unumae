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
  useAppealableDecisions,
  useSubmitAppeal,
} from '@/features/privacy/hooks';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';

export default function AppealsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const decisions = useAppealableDecisions();
  const submit = useSubmitAppeal();
  const [selected, setSelected] = useState<string | null>(null);
  const [statement, setStatement] = useState('');

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('privacy.appeals') }}
      />
      <Screen>
        <PageHeader
          subtitle={t('privacy.appealsBody')}
          title={t('privacy.appeals')}
        />
        {decisions.isLoading ? (
          <Skeleton height={160} radius={theme.radius.xl} />
        ) : decisions.isError ? (
          <ErrorState
            error={toAppError(decisions.error)}
            onRetry={() => void decisions.refetch()}
          />
        ) : decisions.data && decisions.data.length > 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            {decisions.data.map((decision) => (
              <Surface
                key={decision.event_id}
                style={{ gap: theme.spacing.md }}
              >
                <View
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    variant="callout"
                    style={{ flex: 1, fontWeight: '600' }}
                  >
                    {t(`privacy.decisionActions.${decision.action}`)}
                  </Text>
                  {decision.appeal_status ? (
                    <Pill
                      label={t(
                        `privacy.appealStatuses.${decision.appeal_status}`
                      )}
                    />
                  ) : null}
                </View>
                {decision.reason ? (
                  <Text color="textSecondary">{decision.reason}</Text>
                ) : null}
                {decision.resolution_note ? (
                  <Text color="textTertiary" variant="footnote">
                    {decision.resolution_note}
                  </Text>
                ) : null}
                {!decision.appeal_status ? (
                  selected === decision.event_id ? (
                    <View style={{ gap: theme.spacing.md }}>
                      <TextField
                        label={t('privacy.appealStatement')}
                        maxLength={1000}
                        multiline
                        onChangeText={setStatement}
                        value={statement}
                      />
                      <Button
                        disabled={
                          statement.trim().length < 10 || submit.isPending
                        }
                        label={t('privacy.submitAppeal')}
                        onPress={() =>
                          submit.mutate([decision.event_id, statement], {
                            onSuccess: () => {
                              setSelected(null);
                              setStatement('');
                            },
                          })
                        }
                      />
                    </View>
                  ) : (
                    <Button
                      label={t('privacy.appealDecision')}
                      onPress={() => setSelected(decision.event_id)}
                      variant="secondary"
                    />
                  )
                ) : null}
              </Surface>
            ))}
          </View>
        ) : (
          <EmptyState
            body={t('privacy.appealsEmptyBody')}
            icon="message-square"
            title={t('privacy.appealsEmpty')}
          />
        )}
      </Screen>
    </>
  );
}
