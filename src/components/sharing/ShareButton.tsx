import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { captureCard, shareCardImage } from '@/features/sharing/card';
import {
  buildShareMessage,
  shareHuman,
  type ShareableHuman,
} from '@/features/sharing/share';
import { track } from '@/lib/analytics';

import { ShareCard } from './ShareCard';

/**
 * The share button, and the card it exports.
 *
 * Sharing is the only growth mechanism this product has, and the only one it is
 * allowed: a person passing on somebody they found worth passing on
 * (Article 1.8). So it is worth the card being good.
 *
 * The card is rendered off-screen at a fixed pixel size, captured, and shared
 * as an image with the link. If the capture is not possible — an older build,
 * a missing native module, a device that refuses — it falls back to the text
 * share without saying anything about it. A share button that does nothing is
 * a worse outcome than a share without a picture.
 */
export function ShareButton({
  human,
  photoUri,
}: {
  human: ShareableHuman;
  photoUri?: string | null;
}) {
  const { t } = useTranslation();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    setBusy(true);
    try {
      const uri = await captureCard(cardRef);

      if (uri) {
        track('share_started', { today: human.isToday, card: true });
        const shared = await shareCardImage(uri, t('sharing.share'));
        if (shared) {
          // expo-sharing cannot tell us whether the person went through with
          // it, so this counts opening the sheet with a card. The text path
          // still reports the stricter number; docs/BETA.md notes the
          // difference so the share rate is not read as more precise than it
          // is.
          track('share_completed', { today: human.isToday, card: true });
          return;
        }
      }

      // No card, or the image sheet refused. Text and a link still work.
      await shareHuman(human, t('sharing.tagline'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        disabled={busy}
        label={t('sharing.share')}
        onPress={() => void handleShare()}
        variant="secondary"
      />

      {/*
        Off-screen rather than hidden: a view with zero opacity or display:none
        captures as blank on Android. Pushed far enough left that it can never
        appear, and excluded from the accessibility tree so a screen reader does
        not read the card and then the screen it duplicates.
      */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={{ position: 'absolute', left: -20000, top: 0 }}
      >
        <ShareCard
          countryLine={`${human.flag} ${human.countryName}`.trim()}
          humanNumber={human.humanNumber}
          name={human.name}
          photoUri={photoUri}
          quote={human.quote}
          ref={cardRef}
        />
      </View>
    </>
  );
}

/** Re-exported so callers do not need two imports to build the message. */
export { buildShareMessage };
