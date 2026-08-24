import AsyncStorage from '@react-native-async-storage/async-storage';

import { track } from './index';

const ACTIVE_DAY_KEY = 'unumae.analytics.last_active_utc_day';

let inMemoryDay: string | null = null;
let pending: Promise<boolean> | null = null;

export function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Records at most one foreground presence per installation and UTC day. */
export function recordActiveDay(date = new Date()): Promise<boolean> {
  const day = utcDay(date);

  if (inMemoryDay === day) {
    return Promise.resolve(false);
  }

  if (pending) {
    return pending;
  }

  pending = (async () => {
    try {
      const stored = await AsyncStorage.getItem(ACTIVE_DAY_KEY);
      if (stored === day) {
        inMemoryDay = day;
        return false;
      }

      await AsyncStorage.setItem(ACTIVE_DAY_KEY, day);
    } catch {
      // Foregrounding must never fail because analytics storage is unavailable.
      // The in-memory and database guards still prevent inflated sessions.
    }

    inMemoryDay = day;
    track('active_day');
    return true;
  })().finally(() => {
    pending = null;
  });

  return pending;
}

/** Test-only reset for deterministic module-level state. */
export function resetActiveDayForTests(): void {
  inMemoryDay = null;
  pending = null;
}
