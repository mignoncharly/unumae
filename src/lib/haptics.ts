import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics, used sparingly and switchable off.
 *
 * The plan lists haptics as optional, and Article 11 keeps feedback discreet.
 * So there is exactly one kind here — a light confirmation that something was
 * recorded — and no success fanfare, no error buzz, and nothing on a scroll.
 *
 * A vibration that celebrates would make Remember feel like a reward, which is
 * precisely what Article 9.4 keeps it from being.
 */
let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function areHapticsEnabled(): boolean {
  return enabled;
}

/** A single light tap. The only haptic this product has. */
export function confirm(): void {
  if (!enabled || Platform.OS === 'web') {
    return;
  }

  // Never awaited and never allowed to throw: feedback failing is not worth
  // interrupting the action it was confirming.
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
    () => undefined
  );
}
