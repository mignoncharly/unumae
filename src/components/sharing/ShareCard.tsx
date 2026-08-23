import { Image } from 'expo-image';
import { forwardRef } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { WEBSITE_URL } from '@/constants/links';
import { useTheme } from '@/theme';
import { formatHumanNumber } from '@/utils/cycle';

export interface ShareCardProps {
  humanNumber: number;
  name: string;
  countryLine: string;
  quote?: string | null | undefined;
  photoUri?: string | null | undefined;
}

/** 4:5, the aspect ratio every social platform crops least badly. */
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

/**
 * The card that leaves the app.
 *
 * It has to work for somebody who has never heard of this product and is
 * looking at a screenshot in a feed, so it carries the four things that make a
 * stranger legible — a number, a name, a place, and one line in their own words
 * — and the address where the rest of them is.
 *
 * What it deliberately does not carry: how many people saw them, how many
 * Remembered them, any count at all. A share card is the most public surface
 * the product has, and it is the last place a person should be turned into a
 * score (Article 9.4).
 *
 * Rendered off-screen at a fixed pixel size rather than at the device's, so the
 * exported image is identical from every phone.
 */
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { humanNumber, name, countryLine, quote, photoUri },
  ref
) {
  const theme = useTheme();

  return (
    <View
      collapsable={false}
      ref={ref}
      style={{
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        backgroundColor: theme.colors.background,
        padding: 72,
        justifyContent: 'space-between',
      }}
    >
      <Text
        allowFontScaling={false}
        color="textTertiary"
        style={{ fontSize: 32, letterSpacing: 4 }}
        variant="mono"
      >
        {formatHumanNumber(humanNumber)}
      </Text>

      {photoUri ? (
        <Image
          accessibilityIgnoresInvertColors
          // Deliberately empty: the whole card is captured to an image and
          // hidden from the accessibility tree, so there is nothing here for a
          // screen reader to gain from describing twice.
          alt=""
          cachePolicy="disk"
          contentFit="cover"
          source={{ uri: photoUri }}
          style={{
            width: '100%',
            aspectRatio: 1,
            borderRadius: 24,
            backgroundColor: theme.colors.surface,
          }}
        />
      ) : null}

      <View style={{ gap: 16 }}>
        <Text
          allowFontScaling={false}
          style={{ fontSize: 96, lineHeight: 104 }}
        >
          {name}
        </Text>
        <Text
          allowFontScaling={false}
          color="textSecondary"
          style={{ fontSize: 40 }}
        >
          {countryLine}
        </Text>

        {quote ? (
          <Text
            allowFontScaling={false}
            color="textSecondary"
            numberOfLines={4}
            style={{ fontSize: 40, lineHeight: 56, marginTop: 24 }}
          >
            “{quote}”
          </Text>
        ) : null}
      </View>

      <Text
        allowFontScaling={false}
        color="textTertiary"
        style={{ fontSize: 32 }}
        variant="mono"
      >
        {WEBSITE_URL.replace(/^https?:\/\//, '')}
      </Text>
    </View>
  );
});
