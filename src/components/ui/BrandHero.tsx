import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export function BrandHero({
  title,
  body,
  step,
}: {
  title: string;
  body?: string;
  step?: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={{
        backgroundColor: theme.colors.brandDark,
        borderRadius: theme.radius.xxl,
        gap: theme.spacing.xl,
        overflow: 'hidden',
        padding: theme.spacing.xl,
        position: 'relative',
      }}
    >
      <View
        pointerEvents="none"
        style={{
          backgroundColor: theme.colors.brandBlue,
          borderRadius: 90,
          height: 180,
          opacity: 0.5,
          position: 'absolute',
          right: -90,
          top: -70,
          width: 180,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: theme.colors.brandViolet,
          borderRadius: 70,
          bottom: -90,
          height: 150,
          left: -50,
          opacity: 0.3,
          position: 'absolute',
          width: 150,
        }}
      />
      <Image
        accessibilityIgnoresInvertColors
        alt={t('common.appName')}
        cachePolicy="memory-disk"
        contentFit="contain"
        source={require('../../../assets/splash.png')}
        style={{ height: 44, width: 118 }}
      />
      <View style={{ gap: theme.spacing.md }}>
        {step ? (
          <Text
            color="accent"
            variant="caption"
            style={{ fontWeight: '700', letterSpacing: 1.2 }}
          >
            {step.toUpperCase()}
          </Text>
        ) : null}
        <Text
          variant="display"
          style={{ color: theme.colors.onBrand, letterSpacing: -1.2 }}
        >
          {title}
        </Text>
        {body ? (
          <Text
            variant="callout"
            style={{ color: theme.colors.onBrandSecondary }}
          >
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
