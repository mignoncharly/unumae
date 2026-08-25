export const MAX_ANALYTICS_BODY_BYTES = 16 * 1024;
export const MAX_ANALYTICS_BATCH = 20;

const APP_EVENTS = new Set([
  'app_opened',
  'active_day',
  'today_viewed',
  'signup_started',
  'signup_completed',
  'selection_accepted',
  'selection_declined',
  'portrait_started',
  'portrait_submitted',
  'portrait_completed',
  'question_started',
  'question_submitted',
  'question_voted',
  'question_unvoted',
  'archive_opened',
  'human_remembered',
  'human_forgotten',
  'remembered_library_opened',
  'share_started',
  'share_completed',
  'share_sheet_opened',
  'notification_opened',
  'language_changed',
]);
const MARKETING_EVENTS = new Set([
  'selection_explainer_opened',
  'archive_opened',
  'mission_opened',
]);
const LOCALE = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const ROUTE = /^[a-z][a-z0-9_-]{0,39}$/;

export interface AnalyticsEnvelope {
  marketingOnly: boolean;
  events: Array<{ event: string; properties: Record<string, unknown> }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseAnalyticsEnvelope(
  value: unknown
): AnalyticsEnvelope | null {
  if (!isRecord(value)) return null;
  if (typeof value.event === 'string') {
    if (
      !MARKETING_EVENTS.has(value.event) ||
      typeof value.locale !== 'string' ||
      !LOCALE.test(value.locale) ||
      typeof value.source !== 'string' ||
      !ROUTE.test(value.source)
    )
      return null;
    return {
      marketingOnly: true,
      events: [
        {
          event: value.event,
          properties: { locale: value.locale, source: value.source },
        },
      ],
    };
  }
  if (
    !Array.isArray(value.events) ||
    value.events.length < 1 ||
    value.events.length > MAX_ANALYTICS_BATCH
  ) {
    return null;
  }
  const events: AnalyticsEnvelope['events'] = [];
  for (const item of value.events) {
    if (
      !isRecord(item) ||
      typeof item.event !== 'string' ||
      !APP_EVENTS.has(item.event)
    )
      return null;
    const properties = item.properties ?? {};
    if (!isRecord(properties) || JSON.stringify(properties).length > 1024)
      return null;
    events.push({ event: item.event, properties });
  }
  return { marketingOnly: false, events };
}
