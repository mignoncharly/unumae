import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/theme';

/**
 * "Selecting tomorrow's human…"
 *
 * The one ceremonial animation in the product (Article 11). It is a slow,
 * single fade — deliberately not a spinning reel of faces, which would turn a
 * fair draw into a slot machine and imply the outcome is still being decided
 * while you watch. It is not: the draw happened at D-2 00:00 UTC.
 */
export function SelectingHuman() {
  const theme = useTheme();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(
    () => new Animated.Value(reducedMotion ? 1 : 0.35)
  );

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: theme.motion.durations.ceremonial,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: theme.motion.durations.ceremonial,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [opacity, reducedMotion, theme.motion.durations.ceremonial]);

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ alignItems: 'center', paddingVertical: theme.spacing.xxxl }}
    >
      <Animated.View style={{ opacity }}>
        <Text color="textSecondary" variant="callout">
          {t('today.selectingTomorrow')}
        </Text>
      </Animated.View>
    </View>
  );
}
