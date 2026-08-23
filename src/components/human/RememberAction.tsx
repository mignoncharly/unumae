import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { confirm } from '@/lib/haptics';
import { useTheme } from '@/theme';

export function RememberAction({
  remembered,
  label,
  supportingText,
  onPress,
}: {
  remembered: boolean;
  label: string;
  supportingText: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!remembered || reducedMotion) return;
    Animated.sequence([
      Animated.timing(scale, {
        duration: theme.motion.durations.instant,
        toValue: 1.08,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        duration: theme.motion.durations.fast,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    remembered,
    reducedMotion,
    scale,
    theme.motion.durations.fast,
    theme.motion.durations.instant,
  ]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: remembered }}
      onPress={() => {
        confirm();
        onPress();
      }}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: remembered
          ? theme.colors.violetSurface
          : theme.colors.surfaceRaised,
        borderColor: remembered ? theme.colors.violet : theme.colors.border,
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        flexDirection: 'row',
        gap: theme.spacing.lg,
        minHeight: 76,
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
      })}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          backgroundColor: remembered
            ? theme.colors.violet
            : theme.colors.accentSurface,
          borderRadius: theme.radius.full,
          height: 44,
          justifyContent: 'center',
          transform: [{ scale }],
          width: 44,
        }}
      >
        <Feather
          color={remembered ? theme.colors.accentText : theme.colors.accent}
          name={remembered ? 'bookmark' : 'book-open'}
          size={20}
        />
      </Animated.View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontWeight: '600' }}>{label}</Text>
        <Text color="textTertiary" variant="footnote">
          {supportingText}
        </Text>
      </View>
      <Feather
        color={remembered ? theme.colors.violet : theme.colors.textTertiary}
        name={remembered ? 'check-circle' : 'plus'}
        size={20}
      />
    </Pressable>
  );
}
