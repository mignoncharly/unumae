import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
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
  /**
   * Joined during Year Zero. A historical note and nothing else — it confers
   * no advantage in the draw, which is enforced in the database rather than
   * promised here.
   */
  founding?: boolean | null;
}

/**
 * The editorial layout. Article 11: the person is the star, so the portrait
 * dominates a quiet branded hero and every answer receives a readable,
 * consistent story surface.
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
  founding = false,
}: HumanPortraitProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [showTranslation, setShowTranslation] = useState(false);
  const hasTranslations =
    translations !== undefined && Object.keys(translations).length > 0;

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <View
        style={{
          backgroundColor: showTimer
            ? theme.colors.accentSurface
            : theme.colors.surfaceMuted,
          borderRadius: theme.radius.xxl,
          gap: theme.spacing.lg,
          overflow: 'hidden',
          padding: theme.spacing.lg,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text
            color="accent"
            variant="mono"
            style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1.2 }}
          >
            {formatHumanNumber(humanNumber)}
          </Text>
          {showTimer ? (
            <Text
              color="textTertiary"
              variant="caption"
              style={{ fontWeight: '600' }}
            >
              {t('today.title').toUpperCase()}
            </Text>
          ) : null}
        </View>

        {photoUri ? (
          <View
            style={{
              borderRadius: theme.radius.xl,
              overflow: 'hidden',
              ...theme.shadows.raised,
            }}
          >
            <Image
              accessibilityIgnoresInvertColors
              alt={t('portrait.photoOf', { name })}
              cachePolicy="disk"
              contentFit="cover"
              source={{ uri: photoUri }}
              style={{
                width: '100%',
                aspectRatio: 4 / 5,
                backgroundColor: theme.colors.surfaceMuted,
              }}
              transition={200}
            />
          </View>
        ) : (
          <View
            accessibilityLabel={t('portrait.photoOf', { name })}
            accessible
            style={{
              alignItems: 'center',
              aspectRatio: 4 / 5,
              backgroundColor: theme.colors.surfaceRaised,
              borderRadius: theme.radius.xl,
              justifyContent: 'center',
            }}
          >
            <Icon color="textTertiary" name="user" size={40} />
          </View>
        )}

        <View
          style={{ gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xs }}
        >
          <Text variant="hero" style={{ letterSpacing: -1.6 }}>
            {name}
          </Text>
          <CountryBadge city={city} countryCode={countryCode} />
          {age != null ? (
            <Text color="textTertiary" variant="footnote">
              {age}
            </Text>
          ) : null}
          {/*
          Deliberately the quietest line on the screen: tertiary, footnote, no
          colour, no pill, no icon. It marks when somebody arrived, and Article
          11 says the person is the star — a badge that competed with their name
          would turn arriving early into a rank.
        */}
          {founding === true ? (
            <Text color="textTertiary" variant="footnote">
              {t('founding.joined')}
            </Text>
          ) : null}
          {showTimer ? <Timer /> : null}
        </View>
      </View>

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

      <View style={{ gap: theme.spacing.xl }}>
        {elements.map((element) => {
          const translated = translations?.[element.id];
          const reading =
            showTranslation && translated ? translated : element.answer;

          return (
            <Surface
              key={element.id}
              tone={element === elements[0] ? 'warm' : 'default'}
              style={{ gap: theme.spacing.md }}
            >
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: theme.spacing.sm,
                }}
              >
                <View
                  style={{
                    backgroundColor: theme.colors.accentSurface,
                    borderRadius: theme.radius.full,
                    height: 28,
                    width: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    color="accent"
                    name={
                      element === elements[0] ? 'message-circle' : 'feather'
                    }
                    size={14}
                  />
                </View>
                <Text
                  color="textTertiary"
                  variant="caption"
                  style={{ flex: 1, fontWeight: '700', letterSpacing: 0.8 }}
                >
                  {element.prompt.toUpperCase()}
                </Text>
              </View>
              <Text
                variant={element === elements[0] ? 'title3' : 'callout'}
                style={
                  element === elements[0]
                    ? { fontStyle: 'italic', lineHeight: 30 }
                    : undefined
                }
              >
                {reading}
              </Text>
              {showTranslation && translated ? (
                <Text color="textTertiary" variant="caption">
                  {t('translation.translated')}
                </Text>
              ) : null}
            </Surface>
          );
        })}
      </View>
    </View>
  );
}
