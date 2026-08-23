import type { RefObject } from 'react';
import type { View } from 'react-native';

/**
 * Turning the card into an image, if this build can.
 *
 * Both `react-native-view-shot` and `expo-sharing` are in Expo Go's bundled
 * modules, so this should work there. "Should" is not good enough for something
 * on the main screen, so nothing here is imported at module scope: the modules
 * are required lazily inside a try, and every failure returns null rather than
 * throwing. A build without them shares text and a link, which is what the
 * product did for the whole of Phase 12 and is not a broken experience.
 *
 * This is the one piece of Phase 15 that cannot be fully exercised in Expo Go
 * on Android without a device to look at the result on, so it is written to be
 * impossible to break the share button with.
 */

interface ViewShotModule {
  captureRef: (
    ref: RefObject<View | null> | View,
    options: { format: 'png'; quality: number; result: 'tmpfile' }
  ) => Promise<string>;
}

interface SharingModule {
  isAvailableAsync: () => Promise<boolean>;
  shareAsync: (
    url: string,
    options?: { mimeType?: string; dialogTitle?: string; UTI?: string }
  ) => Promise<void>;
}

function loadViewShot(): ViewShotModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-view-shot') as ViewShotModule;
  } catch {
    return null;
  }
}

function loadSharing(): SharingModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-sharing') as SharingModule;
  } catch {
    return null;
  }
}

/** Whether a card can be rendered at all in this build. */
export function canRenderCard(): boolean {
  const { viewShot, sharing } = cardCapabilities();
  return viewShot && sharing;
}

/**
 * Which half is missing, for the developer screen.
 *
 * The two modules fail independently and for different reasons, and "sharing
 * is broken" is a much harder thing to act on than "view-shot did not load".
 */
export function cardCapabilities(): { viewShot: boolean; sharing: boolean } {
  return {
    viewShot: loadViewShot() !== null,
    sharing: loadSharing() !== null,
  };
}

/**
 * Captures the card and returns a file URI, or null if anything at all went
 * wrong. Callers treat null as "share the text instead", never as an error.
 */
export async function captureCard(
  ref: RefObject<View | null>
): Promise<string | null> {
  const viewShot = loadViewShot();
  if (!viewShot || !ref.current) {
    return null;
  }

  try {
    return await viewShot.captureRef(ref, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
  } catch {
    return null;
  }
}

/**
 * Opens the system sheet with the image.
 *
 * Returns false if the image could not be shared, so the caller can fall back
 * to the text share rather than leaving the button apparently dead.
 */
export async function shareCardImage(
  uri: string,
  dialogTitle: string
): Promise<boolean> {
  const sharing = loadSharing();
  if (!sharing) {
    return false;
  }

  try {
    if (!(await sharing.isAvailableAsync())) {
      return false;
    }

    await sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle,
      UTI: 'public.png',
    });
    return true;
  } catch {
    return false;
  }
}
