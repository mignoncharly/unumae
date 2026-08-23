import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';

import { getSupabase } from '@/lib/supabase';

import type {
  AnalyticsEvent,
  AnalyticsProperties,
  AnalyticsProvider,
} from './index';

/**
 * First-party analytics: a table in our own database, and nowhere else.
 *
 * Three rules this implementation exists to keep:
 *
 *   1. It must never break the app. Every failure is swallowed — a product
 *      that crashes because a metric could not be recorded has its priorities
 *      backwards.
 *   2. It must never block a screen. Events are buffered and flushed.
 *   3. It must never collect more than the enum allows. The payload is an
 *      event name and small properties; there is nowhere to put a device, an
 *      address or a location, because the table has no such column.
 */

const INSTALL_ID_KEY = 'unumae.install_id';
const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_AT_COUNT = 20;
const MAX_BUFFER = 100;

interface QueuedEvent {
  event: AnalyticsEvent;
  properties?: AnalyticsProperties;
}

/**
 * A random identifier for this installation.
 *
 * Its only purpose is answering "did people come back the next day", which is
 * the one number worth knowing before spending anything on growth. It is not
 * an advertising identifier, it is disclosed on the privacy screen, and it
 * never leaves our database.
 */
async function getInstallId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(INSTALL_ID_KEY);
    if (existing) {
      return existing;
    }

    const created = Crypto.randomUUID();
    await AsyncStorage.setItem(INSTALL_ID_KEY, created);
    return created;
  } catch {
    // Storage unavailable: use a per-session id rather than losing the event.
    // Retention numbers will be slightly low, which is the right way to be
    // wrong.
    return Crypto.randomUUID();
  }
}

export function createSupabaseAnalytics(): AnalyticsProvider {
  let buffer: QueuedEvent[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  let installId: string | null = null;

  async function flush(): Promise<void> {
    if (buffer.length === 0) {
      return;
    }

    const batch = buffer;
    buffer = [];

    try {
      installId ??= await getInstallId();

      await getSupabase().rpc('track_events', {
        batch_install_id: installId,
        batch: batch.map((item) => ({
          event: item.event,
          properties: item.properties ?? {},
        })),
      });
    } catch {
      // Deliberately silent, and deliberately not re-queued: a failing network
      // should not grow an unbounded buffer of stale events.
    }
  }

  function start(): void {
    if (timer) {
      return;
    }

    timer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);

    // Leaving the app is the last chance to send what happened in it.
    AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        void flush();
      }
    });
  }

  return {
    track(event, properties) {
      start();

      if (buffer.length >= MAX_BUFFER) {
        return;
      }

      buffer.push(properties ? { event, properties } : { event });

      if (buffer.length >= FLUSH_AT_COUNT) {
        void flush();
      }
    },
  };
}
