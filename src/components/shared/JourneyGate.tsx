import { router, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import { journeyRoute } from '@/features/selection/journey';
import { useHumanJourney } from '@/features/selection/journeyApi';

/**
 * Surfaces time-sensitive selection work from anywhere in the app once per
 * state change. Back remains meaningful: after the first prompt the person may
 * leave and resume from the journey card instead of being trapped in a loop.
 */
export function JourneyGate() {
  const segments = useSegments();
  const rootSegment = segments[0];
  const { data: journey } = useHumanJourney();
  const prompted = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!journey || rootSegment === '(selection)') {
      return;
    }

    if (journey.action !== 'respond' && journey.action !== 'write-portrait') {
      return;
    }

    const key = `${journey.drawId}:${journey.action}`;
    if (prompted.current === key) {
      return;
    }

    prompted.current = key;
    router.push(journeyRoute(journey.action, journey.drawId));
  }, [journey, rootSegment]);

  return null;
}
