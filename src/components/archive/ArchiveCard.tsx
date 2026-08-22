import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { CountryBadge } from '@/components/human/CountryBadge';
import { Text } from '@/components/ui/Text';
import { signArchivePhoto } from '@/features/archive/api';
import { useTheme } from '@/theme';
import { formatHumanNumber } from '@/utils/cycle';

interface ArchiveCardProps {
  humanNumber: number;
  selectionDate: string;
  displayName: string | null;
  countryCode: string | null;
  photoPath: string | null;
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
  photoPath,
  isRemoved,
  onPress,
}: ArchiveCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void signArchivePhoto(photoPath).then((url) => {
      if (active) {
        setPhotoUrl(url);
      }
    });
    return () => {
      active = false;
    };
  }, [photoPath]);

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
        paddingVertical: theme.spacing.lg,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Image
        accessibilityIgnoresInvertColors
        source={photoUrl ? { uri: photoUrl } : undefined}
        style={{
          width: 56,
          height: 70,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.surface,
        }}
      />

      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <Text color="textTertiary" variant="caption">
          {formatHumanNumber(humanNumber)} · {selectionDate}
        </Text>
        <Text variant="callout">{displayName}</Text>
        {countryCode ? <CountryBadge countryCode={countryCode} /> : null}
      </View>
    </Pressable>
  );
}
