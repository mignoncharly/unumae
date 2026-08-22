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
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
      }}
    >
      {flag ? <Text variant="callout">{flag}</Text> : null}
      <Text color="textSecondary" variant="callout">
        {label}
      </Text>
    </View>
  );
}
