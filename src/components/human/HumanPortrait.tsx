import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, View } from 'react-native';

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
  /**
   * Translations of the answers, keyed by element id. Additive by design: the
   * original is always present and the reader chooses (Article 9.6).
   */
  translations?: Record<string, string>;
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
  translations,
  showTimer = false,
}: HumanPortraitProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [showTranslation, setShowTranslation] = useState(false);
  const hasTranslations =
    translations !== undefined && Object.keys(translations).length > 0;

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

      {/*
        Article 9.6 — a translation is added, never substituted. Somebody's own
        words in their own language are part of who they are, so the toggle
        starts on the original and the label always says which you are reading.
      */}
      {hasTranslations ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: showTranslation }}
          onPress={() => setShowTranslation((previous) => !previous)}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text color="accent" variant="footnote">
            {showTranslation
              ? t('translation.showOriginal')
              : t('translation.showTranslated')}
          </Text>
        </Pressable>
      ) : null}

      <View style={{ gap: theme.spacing.xxl }}>
        {elements.map((element) => {
          const translated = translations?.[element.id];
          const reading =
            showTranslation && translated ? translated : element.answer;

          return (
            <View key={element.id} style={{ gap: theme.spacing.sm }}>
              <Text color="textTertiary" variant="footnote">
                {element.prompt.toUpperCase()}
              </Text>
              <Text variant="callout">{reading}</Text>
              {showTranslation && translated ? (
                <Text color="textTertiary" variant="caption">
                  {t('translation.translated')}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
