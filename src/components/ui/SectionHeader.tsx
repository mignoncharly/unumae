import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export function SectionHeader({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'flex-end',
        flexDirection: 'row',
        gap: theme.spacing.md,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <Text
          variant="title2"
          style={{ fontWeight: '600', letterSpacing: -0.4 }}
        >
          {title}
        </Text>
        {caption ? (
          <Text color="textSecondary" variant="footnote">
            {caption}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
