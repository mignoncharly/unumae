/**
 * Analytics contract — Phase 11 supplies a real provider.
 *
 * The event list is fixed here rather than invented per call site, because
 * Article 12 requires the product to be able to explain what it measures. Note
 * what is absent: nothing tracks a human's popularity, because nothing in the
 * product ranks humans (Article 1.2).
 */
export type AnalyticsEvent =
  | 'app_opened'
  | 'today_viewed'
  | 'portrait_completed'
  | 'archive_opened'
  | 'question_started'
  | 'question_submitted'
  | 'question_voted'
  | 'human_remembered'
  | 'signup_started'
  | 'signup_completed'
  | 'selection_accepted'
  | 'selection_declined'
  | 'notification_opened'
  | 'share_started'
  | 'share_completed'
  | 'language_changed';

/**
 * Flat scalars only.
 *
 * Not a type-safety nicety: a nested object is how a stray user record ends up
 * in an analytics table by accident. If a value cannot be written as one of
 * these, it does not belong in an event.
 */
export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null
>;

export interface AnalyticsProvider {
  track(event: AnalyticsEvent, properties?: AnalyticsProperties): void;
}

/** No-op until Phase 11. Swapping this in one place is the whole point. */
const noopProvider: AnalyticsProvider = {
  track: () => {},
};

let provider: AnalyticsProvider = noopProvider;

export function setAnalyticsProvider(next: AnalyticsProvider): void {
  provider = next;
}

export function track(
  event: AnalyticsEvent,
  properties?: AnalyticsProperties
): void {
  provider.track(event, properties);
}
