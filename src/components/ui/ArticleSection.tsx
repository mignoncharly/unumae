import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Surface } from './Surface';
import { Text } from './Text';

export function ArticleSection({
  title,
  children,
  icon = 'feather',
  tone = 'default',
}: {
  title: string;
  children: ReactNode;
  icon?: IconName;
  tone?: 'default' | 'warm' | 'accent';
}) {
  const theme = useTheme();
  return (
    <Surface tone={tone} style={{ gap: theme.spacing.md }}>
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
            backgroundColor: theme.colors.accentSurface,
            borderRadius: theme.radius.full,
            height: 34,
            justifyContent: 'center',
            width: 34,
          }}
        >
          <Icon color="accent" name={icon} size={16} />
        </View>
        <Text variant="title3" style={{ flex: 1, fontWeight: '600' }}>
          {title}
        </Text>
      </View>
      {typeof children === 'string' ? (
        <Text color="textSecondary">{children}</Text>
      ) : (
        children
      )}
    </Surface>
  );
}
