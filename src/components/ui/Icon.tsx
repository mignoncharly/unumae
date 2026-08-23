import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

import { useTheme, type ColorToken } from '@/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

export function Icon({
  name,
  size = 20,
  color = 'textSecondary',
}: {
  name: IconName;
  size?: number;
  color?: ColorToken;
}) {
  const theme = useTheme();
  return <Feather color={theme.colors[color]} name={name} size={size} />;
}
