import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Sign in with Apple, isolated behind a runtime check.
 *
 * `expo-apple-authentication` is an iOS-only native module. Importing it at
 * module scope would run on Android and in Expo Go too, where it may not exist
 * at all — so it is required lazily and every failure resolves to "not
 * available" rather than to a crash on a screen a guest can reach.
 *
 * The implementation is deliberately untouched by this: it is ready for a
 * development build on a real iPhone, and simply hides itself everywhere it
 * cannot work.
 */
type AppleModule = typeof import('expo-apple-authentication');

let cached: AppleModule | null | undefined;

export type AppleUnavailableReason =
  | 'not-ios'
  /**
   * Expo Go signs its own bundle, so it does not carry this app's Sign in with
   * Apple entitlement. The button would appear and then fail at the system
   * level, which is worse than not offering it.
   */
  | 'expo-go'
  | 'module-missing'
  | 'device-unsupported';

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function loadAppleModule(): AppleModule | null {
  if (cached !== undefined) {
    return cached;
  }

  if (Platform.OS !== 'ios' || isExpoGo) {
    cached = null;
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-apple-authentication') as AppleModule;
  } catch {
    cached = null;
  }

  return cached;
}

/** Why the Apple button is not being shown, or null when it is. */
export function appleUnavailableReason(): AppleUnavailableReason | null {
  if (Platform.OS !== 'ios') {
    return 'not-ios';
  }
  if (isExpoGo) {
    return 'expo-go';
  }
  if (!loadAppleModule()) {
    return 'module-missing';
  }
  return null;
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  const apple = loadAppleModule();
  if (!apple) {
    return false;
  }

  try {
    return await apple.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Test seam: forget which module was resolved. */
export function resetAppleModuleCache(): void {
  cached = undefined;
}
