import {
  isLocale,
  isMarketingEvent,
  isRouteKey,
  privacySignalEnabled,
  type MarketingEventPayload,
} from '../lib/analytics';

declare global {
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

const endpoint = document.body.dataset.analyticsEndpoint;
const locale = document.documentElement.lang;
const source = document.body.dataset.route;

if (
  endpoint &&
  isLocale(locale) &&
  source &&
  isRouteKey(source) &&
  !privacySignalEnabled(navigator.doNotTrack, navigator.globalPrivacyControl)
) {
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const action = target.closest<HTMLElement>('[data-analytics-event]');
    const eventName = action?.dataset.analyticsEvent;
    if (!eventName || !isMarketingEvent(eventName)) {
      return;
    }

    const payload: MarketingEventPayload = {
      event: eventName,
      locale,
      source,
    };
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        endpoint,
        new Blob([body], { type: 'application/json' })
      );
      return;
    }

    void fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      credentials: 'same-origin',
      keepalive: true,
    });
  });
}
