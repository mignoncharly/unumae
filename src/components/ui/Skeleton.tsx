import { useEffect, useState } from 'react';
import { Animated, type DimensionValue } from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

/**
 * A calm pulse, not a shimmer sweep. Article 11: the interface is furniture,
 * and furniture does not glitter while you wait.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  radius,
}: SkeletonProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(0.5);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: theme.motion.durations.slow,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: theme.motion.durations.slow,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [opacity, reducedMotion, theme.motion.durations.slow]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        opacity,
        borderRadius: radius ?? theme.radius.sm,
        backgroundColor: theme.colors.surfaceMuted,
      }}
    />
  );
}
