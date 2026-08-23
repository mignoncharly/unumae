import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  ShareCard,
} from '@/components/sharing/ShareCard';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import {
  captureCard,
  cardCapabilities,
  shareCardImage,
} from '@/features/sharing/card';
import { useTheme } from '@/theme';

/**
 * The share card, made visible.
 *
 * The card is normally rendered 20,000 points off-screen and captured straight
 * to a PNG, and if the capture fails the share button quietly falls back to
 * text. That is the right behaviour in the product — a share button that does
 * nothing is worse than a share without a picture — but it means a card that
 * renders badly, or does not render at all, never announces itself.
 *
 * So this screen makes both answerable by looking:
 *
 *   1. Whether the two native modules are present, named separately, because
 *      they fail for different reasons and only one of them is worth panicking
 *      about.
 *   2. What the card looks like, scaled to fit.
 *   3. What the *captured file* looks like — which is not the same question.
 *      The preview proves the layout; only the capture proves the capture.
 *
 * Developer surfaces are exempt from the no-hardcoded-strings rule.
 */
const SAMPLE = {
  humanNumber: 128,
  name: 'Aya',
  countryLine: '🇯🇵 Japan',
  quote:
    'The five minutes before the shop opens, when the light is on but the door is still locked.',
};

export default function ShareCardDevScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cardRef = useRef<View>(null);

  const [captured, setCaptured] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { viewShot, sharing } = cardCapabilities();

  // The card is a fixed 1080 wide. Fit it to the screen with room to breathe.
  const scale = (width - theme.spacing.xl * 2) / SHARE_CARD_WIDTH;

  async function handleCapture() {
    setBusy(true);
    setStatus(null);
    try {
      const uri = await captureCard(cardRef);
      setCaptured(uri);
      setStatus(
        uri === null
          ? 'captureCard returned null — the share button would fall back to text.'
          : `captured to ${uri}`
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!captured) {
      return;
    }
    const ok = await shareCardImage(captured, 'Share card');
    setStatus(
      ok
        ? 'shareCardImage opened the sheet.'
        : 'shareCardImage returned false — the share button would fall back to text.'
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Share card' }} />
      <Screen>
        <Text variant="title2">Capture support</Text>

        <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.xs }}>
          {/*
            Stated in words rather than as a colour, so the answer survives a
            screenshot sent to somebody else.
          */}
          <Text color={viewShot ? 'text' : 'danger'}>
            react-native-view-shot: {viewShot ? 'present' : 'MISSING'}
          </Text>
          <Text color={sharing ? 'text' : 'danger'}>
            expo-sharing: {sharing ? 'present' : 'MISSING'}
          </Text>
          <Text color="textTertiary" variant="footnote">
            {viewShot && sharing
              ? 'Both present. The share button should export an image.'
              : 'The share button will silently share text and a link instead.'}
          </Text>
        </View>

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
          <Button
            disabled={busy}
            label="Capture it"
            onPress={() => void handleCapture()}
          />
          {captured ? (
            <Button
              label="Open the share sheet"
              onPress={() => void handleShare()}
              variant="secondary"
            />
          ) : null}
          {status ? (
            <Text color="textSecondary" variant="footnote">
              {status}
            </Text>
          ) : null}
        </View>

        {/*
          The captured file, not the live view. A card can look right on screen
          and export blank — Android in particular captures an empty bitmap from
          a view with zero opacity — so this is the only check that counts.
        */}
        {captured ? (
          <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.sm }}>
            <Text color="textTertiary" variant="footnote">
              THE CAPTURED FILE
            </Text>
            <Image
              accessibilityIgnoresInvertColors
              alt="The captured share card"
              // A fresh temp file with a new path on every capture. Caching it
              // would only accumulate garbage, and would risk showing the
              // previous capture when debugging the current one.
              cachePolicy="none"
              contentFit="contain"
              source={{ uri: captured }}
              style={{
                width: '100%',
                aspectRatio: SHARE_CARD_WIDTH / SHARE_CARD_HEIGHT,
                backgroundColor: theme.colors.surface,
              }}
            />
          </View>
        ) : null}

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.sm }}>
          <Text color="textTertiary" variant="footnote">
            LIVE PREVIEW — {SHARE_CARD_WIDTH}×{SHARE_CARD_HEIGHT}, SHOWN AT{' '}
            {Math.round(scale * 100)}%
          </Text>

          {/*
            Scaled with a transform rather than by resizing the card, so what is
            captured is byte-for-byte what ships. The wrapper takes the scaled
            height because a transform does not affect layout.
          */}
          <View
            style={{
              width: SHARE_CARD_WIDTH * scale,
              height: SHARE_CARD_HEIGHT * scale,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                transform: [{ scale }],
                transformOrigin: 'top left',
              }}
            >
              <ShareCard
                countryLine={SAMPLE.countryLine}
                humanNumber={SAMPLE.humanNumber}
                name={SAMPLE.name}
                quote={SAMPLE.quote}
                ref={cardRef}
              />
            </View>
          </View>
        </View>

        <View style={{ marginTop: theme.spacing.xxl }}>
          <Text color="textTertiary" variant="footnote">
            No photograph here: the real card signs one from private storage,
            and a fabricated URL would prove nothing about that path.
          </Text>
        </View>
      </Screen>
    </>
  );
}
