import { AppState } from 'react-native';

import { getSupabase } from '@/lib/supabase';

import { getAnalyticsSessionToken } from './session';

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

const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_AT_COUNT = 20;
const MAX_BUFFER = 100;

interface QueuedEvent {
  event: AnalyticsEvent;
  properties?: AnalyticsProperties;
}

/** Events are accepted only after the server has issued an attested session. */
export function createSupabaseAnalytics(): AnalyticsProvider {
  let buffer: QueuedEvent[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;

  async function flush(): Promise<void> {
    if (buffer.length === 0) {
      return;
    }

    const batch = buffer;
    buffer = [];

    try {
      const installationSession = await getAnalyticsSessionToken();
      if (!installationSession) return;
      await getSupabase().functions.invoke('analytics-ingest', {
        headers: { 'X-Installation-Session': installationSession },
        body: {
          events: batch.map((item) => ({
            event: item.event,
            properties: item.properties ?? {},
          })),
        },
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
