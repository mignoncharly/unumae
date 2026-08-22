import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { track } from '@/lib/analytics';
import { useTheme } from '@/theme';
import {
  formatCountdown,
  getCycleDate,
  getTimeRemaining,
  type TimeRemaining,
} from '@/utils/cycle';

/**
 * TODAY — the core of the application (Phase 7 builds the real portrait).
 *
 * Phase 1 ships the cycle clock only: a live countdown proving that the app
 * runs, that the theme resolves and that the single global UTC window from
 * Article 4 is wired end to end.
 */
export default function TodayScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState<TimeRemaining>(() =>
    getTimeRemaining()
  );

  useEffect(() => {
    track('today_viewed');
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Screen>
      <Text variant="caption" color="textTertiary">
        {getCycleDate().toUpperCase()}
      </Text>

      <View style={{ marginTop: theme.spacing.xxxl }}>
        <Text variant="display">{t('common.appName')}</Text>
        <Text
          variant="callout"
          color="textSecondary"
          style={{ marginTop: theme.spacing.sm }}
        >
          {t('common.tagline')}
        </Text>
      </View>

      <View style={{ marginTop: theme.spacing.xxxl }}>
        <Text variant="mono" color="textSecondary">
          {t('today.remaining', { countdown: formatCountdown(remaining) })}
        </Text>
      </View>

      <View style={{ marginTop: theme.spacing.xxl }}>
        <Text color="textSecondary">{t('today.empty')}</Text>
      </View>

      {/* Article 1.7: you reach the end, and it is finished. */}
      <View style={{ marginTop: theme.spacing.huge }}>
        <Text variant="footnote" color="textTertiary">
          {t('today.endOfStory')}
        </Text>
      </View>
    </Screen>
  );
}
