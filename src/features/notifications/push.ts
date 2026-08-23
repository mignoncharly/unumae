import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';

/**
 * Push registration, isolated behind a runtime check.
 *
 * Remote push does not work in Expo Go — it has no push credentials for this
 * bundle — and development happens in Expo Go today. So the module is required
 * lazily and every failure resolves to "unavailable" rather than to a crash on
 * a settings screen.
 *
 * The implementation is complete and ready for a development build. It simply
 * declines to pretend it works where it cannot.
 */
type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export type PushUnavailableReason = 'expo-go' | 'web' | 'module-missing';

export function loadNotificationsModule(): NotificationsModule | null {
  if (cached !== undefined) {
    return cached;
  }

  if (Platform.OS === 'web' || isExpoGo) {
    cached = null;
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }

  return cached;
}

export function pushUnavailableReason(): PushUnavailableReason | null {
  if (Platform.OS === 'web') {
    return 'web';
  }
  if (isExpoGo) {
    return 'expo-go';
  }
  if (!loadNotificationsModule()) {
    return 'module-missing';
  }
  return null;
}

export function isPushAvailable(): boolean {
  return pushUnavailableReason() === null;
}

/**
 * Asks for permission, gets the Expo push token, and stores it.
 *
 * Returns null when push is unavailable or the person said no. Declining is a
 * normal answer, not an error — the product works entirely without it.
 */
export async function registerForPush(): Promise<string | null> {
  const notifications = loadNotificationsModule();
  if (!notifications) {
    return null;
  }

  const existing = await notifications.getPermissionsAsync();
  let granted = existing.granted;

  if (!granted && existing.canAskAgain) {
    const requested = await notifications.requestPermissionsAsync();
    granted = requested.granted;
  }

  if (!granted) {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const { data: token } = await notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );

  const { error } = await getSupabase().rpc('register_push_token', {
    push_token: token,
    device_platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });

  if (error) {
    throw new AppError('unknown', 'notifications.registerFailed', {
      cause: error,
    });
  }

  return token;
}

export async function unregisterPush(token: string): Promise<void> {
  const { error } = await getSupabase().rpc('unregister_push_token', {
    push_token: token,
  });

  if (error) {
    throw new AppError('unknown', 'notifications.registerFailed', {
      cause: error,
    });
  }
}
