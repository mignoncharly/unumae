import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { journeyRoute, type JourneyAction } from '@/features/selection/journey';
import { useHumanJourney } from '@/features/selection/journeyApi';
import { useTheme } from '@/theme';

const icons: Record<JourneyAction, IconName> = {
  respond: 'mail',
  'write-portrait': 'feather',
  'await-review': 'eye',
  'await-live': 'sunrise',
  'answer-questions': 'message-circle',
  archived: 'book-open',
  rejected: 'shield',
};

export default function SelectionStatusScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { data: journey, isLoading } = useHumanJourney();

  if (isLoading) {
    return (
      <Screen>
        <Skeleton height={78} radius={theme.radius.xl} />
        <Skeleton height={260} radius={theme.radius.xl} />
      </Screen>
    );
  }

  if (!journey) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <Screen>
          <EmptyState
            body={t('journey.noneBody')}
            icon="sunrise"
            title={t('journey.none')}
          />
        </Screen>
      </>
    );
  }

  const prefix = `journey.actions.${journey.action}`;
  const date = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${journey.selectionDate}T12:00:00Z`));
  const canAct =
    journey.action === 'respond' ||
    journey.action === 'write-portrait' ||
    journey.action === 'answer-questions' ||
    journey.action === 'archived';

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <Screen>
        <PageHeader
          eyebrow={t('journey.eyebrow')}
          subtitle={t('journey.statusIntro')}
          title={t('journey.statusTitle')}
        />

        <Surface tone="accent" style={{ gap: theme.spacing.lg }}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: theme.spacing.md,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: theme.colors.surfaceRaised,
                borderRadius: theme.radius.full,
                height: 52,
                justifyContent: 'center',
                width: 52,
              }}
            >
              <Icon color="accent" name={icons[journey.action]} size={24} />
            </View>
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <Text variant="title2">{t(`${prefix}.title`)}</Text>
              <Text color="textTertiary" variant="footnote">
                {t('journey.dateLabel', { date })}
              </Text>
            </View>
          </View>

          <Text color="textSecondary" variant="callout">
            {t(`${prefix}.body`)}
          </Text>

          {canAct ? (
            <Button
              icon={icons[journey.action]}
              label={t(`${prefix}.cta`)}
              onPress={() =>
                router.push(journeyRoute(journey.action, journey.drawId))
              }
            />
          ) : null}
        </Surface>

        <Surface
          tone="warm"
          style={{ marginTop: theme.spacing.xl, gap: theme.spacing.sm }}
        >
          <Text variant="title3">{t('journey.promiseTitle')}</Text>
          <Text color="textSecondary">{t('journey.promiseBody')}</Text>
        </Surface>
      </Screen>
    </>
  );
}
