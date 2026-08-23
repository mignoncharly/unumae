import { locales, pageKeys, type Locale, type RouteKey } from '../content/site';

export const marketingEvents = [
  'selection_explainer_opened',
  'archive_opened',
  'mission_opened',
] as const;

export type MarketingEvent = (typeof marketingEvents)[number];

export interface MarketingEventPayload {
  event: MarketingEvent;
  locale: Locale;
  source: RouteKey;
}

const routeKeys = ['home', ...pageKeys] as const;

export function isMarketingEvent(value: string): value is MarketingEvent {
  return marketingEvents.includes(value as MarketingEvent);
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function isRouteKey(value: string): value is RouteKey {
  return routeKeys.includes(value as RouteKey);
}

/**
 * Marketing measurement is deliberately limited to a same-origin path. This
 * prevents a build-time setting from turning approved funnel events into a
 * third-party browsing-data feed.
 */
export function normalizeAnalyticsEndpoint(
  value: string | undefined
): string | null {
  const endpoint = value?.trim();
  if (
    !endpoint ||
    !endpoint.startsWith('/') ||
    endpoint.startsWith('//') ||
    endpoint.includes('#') ||
    endpoint.includes('\\')
  ) {
    return null;
  }

  const base = new URL('https://unumae.invalid');
  const resolved = new URL(endpoint, base);
  return resolved.origin === base.origin
    ? `${resolved.pathname}${resolved.search}`
    : null;
}

export function privacySignalEnabled(
  doNotTrack: string | null | undefined,
  globalPrivacyControl: boolean | undefined
): boolean {
  return (
    doNotTrack === '1' || doNotTrack === 'yes' || globalPrivacyControl === true
  );
}
