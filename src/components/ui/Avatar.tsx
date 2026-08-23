import { Image } from 'expo-image';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<AvatarSize, number> = {
  sm: 32,
  md: 44,
  lg: 64,
  xl: 96,
};

interface AvatarProps {
  /** Remote or local URI. Absent means the initials fallback. */
  uri?: string | null;
  name: string;
  size?: AvatarSize;
}

/** First letter only. A Human's surname is theirs to withhold (Article 6.3). */
function initial(name: string): string {
  return [...name.trim()][0]?.toUpperCase() ?? '?';
}

export function Avatar({ uri, name, size = 'md' }: AvatarProps) {
  const theme = useTheme();
  const dimension = SIZES[size];

  const shared = {
    width: dimension,
    height: dimension,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
  };

  if (uri) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        alt={name}
        cachePolicy="disk"
        contentFit="cover"
        source={{ uri }}
        style={shared}
      />
    );
  }

  return (
    <View
      accessibilityLabel={name}
      accessible
      style={[
        shared,
        {
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text
        color="textSecondary"
        style={{ fontSize: dimension * 0.4, lineHeight: dimension * 0.5 }}
      >
        {initial(name)}
      </Text>
    </View>
  );
}
