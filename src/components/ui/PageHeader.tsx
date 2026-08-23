import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.xxl }}>
      {eyebrow ? (
        <Text
          color="accent"
          variant="caption"
          style={{ fontWeight: '700', letterSpacing: 1.4 }}
        >
          {eyebrow.toUpperCase()}
        </Text>
      ) : null}
      <Text variant="title1" style={{ letterSpacing: -0.8 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text color="textSecondary" variant="callout" style={{ maxWidth: 560 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
