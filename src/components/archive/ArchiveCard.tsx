import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { CountryBadge } from '@/components/human/CountryBadge';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';
import { formatHumanNumber } from '@/utils/cycle';

interface ArchiveCardProps {
  humanNumber: number;
  selectionDate: string;
  displayName: string | null;
  countryCode: string | null;
  photoUrl: string | null;
  isRemoved: boolean;
  onPress: () => void;
}

/**
 * One entry in the Archive.
 *
 * Note what a card cannot show: there is no count on it, because there is no
 * count to fetch. Article 9.5 forbids the Archive being browsed by popularity,
 * and the simplest way to keep that true is to have nothing to display.
 */
export function ArchiveCard({
  humanNumber,
  selectionDate,
  displayName,
  countryCode,
  photoUrl,
  isRemoved,
  onPress,
}: ArchiveCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  /*
   * A removed Human is still an entry. The number and the date remain so the
   * sequence is unbroken, and the person is gone (Article 8.6). It is stated
   * plainly rather than dressed up as an error.
   */
  if (isRemoved) {
    return (
      <View
        style={{
          paddingVertical: theme.spacing.lg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          gap: theme.spacing.xs,
        }}
      >
        <Text color="textTertiary" variant="mono">
          {formatHumanNumber(humanNumber)}
        </Text>
        <Text color="textTertiary">{t('archive.removed')}</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={`${formatHumanNumber(humanNumber)} ${displayName ?? ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.surfaceRaised,
        opacity: pressed ? 0.65 : 1,
        ...theme.shadows.subtle,
      })}
    >
      <Image
        accessibilityIgnoresInvertColors
        // The card already announces the name and number, so the thumbnail
        // adds nothing for a screen reader and is skipped.
        alt=""
        cachePolicy="disk"
        contentFit="cover"
        source={photoUrl ? { uri: photoUrl } : null}
        style={{
          width: 86,
          height: 108,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceMuted,
        }}
        transition={150}
      />

      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <Text
          color="accent"
          variant="caption"
          style={{ fontWeight: '700', letterSpacing: 0.5 }}
        >
          {formatHumanNumber(humanNumber)}
        </Text>
        <Text variant="title3" style={{ fontWeight: '600' }}>
          {displayName}
        </Text>
        {countryCode ? <CountryBadge countryCode={countryCode} /> : null}
        <Text color="textTertiary" variant="caption">
          {selectionDate}
        </Text>
      </View>
      <Feather
        color={theme.colors.textTertiary}
        name="chevron-right"
        size={20}
      />
    </Pressable>
  );
}
