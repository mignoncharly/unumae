import { Image, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';
import { formatHumanNumber } from '@/utils/cycle';

import { CountryBadge } from './CountryBadge';
import { Timer } from './Timer';

/**
 * One element of the portrait. The prompt is shown above the answer because the
 * question is what makes an ordinary answer interesting — this is the whole
 * reason the portrait is guided rather than a blank textbox (Article 9.1).
 */
export interface PortraitElement {
  id: string;
  prompt: string;
  answer: string;
}

export interface HumanPortraitProps {
  humanNumber: number;
  /** First name only. A surname is theirs to withhold (Article 6.3). */
  name: string;
  countryCode: string;
  city?: string | null;
  photoUri?: string | null;
  /** Optional: age is never required (Article 8.2). */
  age?: number | null;
  elements: PortraitElement[];
  /** Live humans show a countdown; archived ones show nothing. */
  showTimer?: boolean;
}

/**
 * The editorial layout. Article 11: the person is the star, the interface is
 * furniture — so there is no card, no border, no chrome around them.
 */
export function HumanPortrait({
  humanNumber,
  name,
  countryCode,
  city,
  photoUri,
  age,
  elements,
  showTimer = false,
}: HumanPortraitProps) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <Text color="textTertiary" variant="mono">
        {formatHumanNumber(humanNumber)}
      </Text>

      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="display">{name}</Text>
        <CountryBadge city={city} countryCode={countryCode} />
        {age != null ? (
          <Text color="textTertiary" variant="footnote">
            {age}
          </Text>
        ) : null}
      </View>

      {showTimer ? <Timer /> : null}

      {photoUri ? (
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={name}
          source={{ uri: photoUri }}
          style={{
            width: '100%',
            aspectRatio: 4 / 5,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface,
          }}
        />
      ) : null}

      <View style={{ gap: theme.spacing.xxl }}>
        {elements.map((element) => (
          <View key={element.id} style={{ gap: theme.spacing.sm }}>
            <Text color="textTertiary" variant="footnote">
              {element.prompt.toUpperCase()}
            </Text>
            <Text variant="callout">{element.answer}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
