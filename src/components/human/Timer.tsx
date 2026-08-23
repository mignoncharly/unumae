import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';
import {
  formatCountdown,
  getCycleDate,
  getTimeRemaining,
  type CycleDate,
} from '@/utils/cycle';

interface TimerProps {
  cycleDate?: CycleDate;
  /**
   * Freezes the countdown at a fixed instant. Used by tests and the UX preview
   * so a countdown can be asserted without waiting a real second.
   */
  now?: Date;
}

/**
 * `18:43:12 remaining`.
 *
 * The number is identical for every viewer on earth (Article 4.1) — only the
 * surrounding words are localised. Monospaced so the digits do not jitter.
 */
export function Timer({ cycleDate, now }: TimerProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const date = cycleDate ?? getCycleDate(now);
  const frozen = now !== undefined;

  // Only drives the live case. When `now` is given the value is derived below,
  // so no state is synchronised from props.
  const [tick, setTick] = useState(() => getTimeRemaining(date));

  useEffect(() => {
    if (frozen) {
      return;
    }

    const interval = setInterval(() => {
      setTick(getTimeRemaining(date));
    }, 1000);

    return () => clearInterval(interval);
  }, [date, frozen]);

  const remaining = frozen ? getTimeRemaining(date, now) : tick;
  const label = t('today.remaining', {
    countdown: formatCountdown(remaining),
  });

  return (
    <View
      accessibilityLabel={label}
      accessible
      style={{
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.accentSurface,
        borderRadius: theme.radius.full,
        flexDirection: 'row',
        gap: theme.spacing.sm,
        minHeight: 40,
        paddingHorizontal: theme.spacing.md,
      }}
    >
      <Icon
        color={remaining.expired ? 'textTertiary' : 'accent'}
        name="clock"
        size={15}
      />
      <Text
        color={remaining.expired ? 'textTertiary' : 'textSecondary'}
        variant="mono"
        style={{ fontSize: 14 }}
      >
        {label}
      </Text>
    </View>
  );
}
