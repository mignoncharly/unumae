import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { journeyRoute, type JourneyAction } from '@/features/selection/journey';
import { useHumanJourney } from '@/features/selection/journeyApi';
import { useTheme } from '@/theme';

import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { Surface } from '../ui/Surface';
import { Text } from '../ui/Text';

const icons: Record<JourneyAction, IconName> = {
  respond: 'mail',
  'write-portrait': 'feather',
  'await-review': 'eye',
  'await-live': 'sunrise',
  'answer-questions': 'message-circle',
  archived: 'book-open',
  rejected: 'shield',
};

export function JourneyCard({
  includeHistory = false,
}: {
  includeHistory?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: journey, isLoading } = useHumanJourney();

  if (isLoading) {
    return <Skeleton height={144} radius={theme.radius.xl} />;
  }

  if (
    !journey ||
    (!includeHistory &&
      (journey.action === 'archived' || journey.action === 'rejected'))
  ) {
    return null;
  }

  const prefix = `journey.actions.${journey.action}`;
  const hasAction =
    journey.action !== 'await-review' && journey.action !== 'await-live';

  return (
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
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}
        >
          <Icon color="accent" name={icons[journey.action]} size={20} />
        </View>
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Text color="accent" variant="caption" style={{ fontWeight: '700' }}>
            {t('journey.eyebrow').toUpperCase()}
          </Text>
          <Text variant="title3" style={{ fontWeight: '600' }}>
            {t(`${prefix}.title`)}
          </Text>
        </View>
      </View>
      <Text color="textSecondary">{t(`${prefix}.body`)}</Text>
      {hasAction ? (
        <Button
          icon={icons[journey.action]}
          label={t(`${prefix}.cta`)}
          onPress={() =>
            router.push(journeyRoute(journey.action, journey.drawId))
          }
          variant="secondary"
        />
      ) : (
        <Button
          icon="arrow-right"
          label={t('journey.viewStatus')}
          onPress={() => router.push('/(selection)/status')}
          variant="ghost"
        />
      )}
    </Surface>
  );
}
