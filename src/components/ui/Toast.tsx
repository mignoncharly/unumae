import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/theme';

import { Text } from './Text';

export type ToastTone = 'neutral' | 'success' | 'danger';

interface ToastProps {
  message: string;
  tone?: ToastTone;
  visible: boolean;
  onDismiss: () => void;
  durationMs?: number;
}

/**
 * Confirmation, never celebration. "Remembered" is acknowledged quietly — a
 * confetti burst would turn a private library into a reward loop (Article 9.4).
 */
export function Toast({
  message,
  tone = 'neutral',
  visible,
  onDismiss,
  durationMs = 2600,
}: ToastProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      return;
    }

    const duration = reducedMotion ? 0 : theme.motion.durations.fast;
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }).start(onDismiss);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [
    durationMs,
    onDismiss,
    opacity,
    reducedMotion,
    theme.motion.durations.fast,
    visible,
  ]);

  if (!visible) {
    return null;
  }

  const toneColor =
    tone === 'success'
      ? theme.colors.success
      : tone === 'danger'
        ? theme.colors.danger
        : theme.colors.text;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: theme.spacing.xl,
        right: theme.spacing.xl,
        bottom: insets.bottom + theme.spacing.xxl,
        opacity,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor:
            theme.scheme === 'dark'
              ? theme.colors.surfaceRaised
              : theme.colors.text,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radius.lg,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          flexDirection: 'row',
          gap: theme.spacing.md,
          ...theme.shadows.subtle,
        }}
      >
        <Feather
          color={tone === 'neutral' ? theme.colors.accent : toneColor}
          name={
            tone === 'success'
              ? 'check-circle'
              : tone === 'danger'
                ? 'alert-circle'
                : 'bookmark'
          }
          size={18}
        />
        <Text
          color={theme.scheme === 'dark' ? 'text' : 'accentText'}
          style={{ flex: 1 }}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
