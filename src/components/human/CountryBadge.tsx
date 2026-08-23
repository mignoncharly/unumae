import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';
import { countryName, flagEmoji, formatOrigin } from '@/utils/country';

interface CountryBadgeProps {
  countryCode: string;
  /** Optional and hideable — never required (Article 8.2). */
  city?: string | null | undefined;
  showFlag?: boolean;
}

export function CountryBadge({
  countryCode,
  city,
  showFlag = true,
}: CountryBadgeProps) {
  const theme = useTheme();
  const { i18n } = useTranslation();

  const flag = showFlag ? flagEmoji(countryCode) : '';
  const label = formatOrigin(countryCode, city, i18n.language);

  return (
    <View
      accessibilityLabel={countryName(countryCode, i18n.language)}
      accessible
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: theme.radius.full,
        minHeight: 36,
        paddingHorizontal: theme.spacing.md,
      }}
    >
      {flag ? <Text>{flag}</Text> : null}
      <Text
        color="textSecondary"
        variant="footnote"
        style={{ fontWeight: '600' }}
      >
        {label}
      </Text>
    </View>
  );
}
