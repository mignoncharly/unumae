import type { Href } from 'expo-router';

// Article 10 of the plan: the user controls every notification category.

export type NotificationCategory =
  'daily' | 'selected' | 'answered' | 'anniversary';

export const SELECTION_NOTIFICATION_CATEGORY = 'selection_invitation';
export const ACCEPT_SELECTION_ACTION = 'accept_selection';
export const DECLINE_SELECTION_ACTION = 'decline_selection';

function routeDrawId(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('drawId' in data)) {
    return null;
  }
  const drawId = (data as { drawId?: unknown }).drawId;
  return typeof drawId === 'string' && drawId.length > 0 ? drawId : null;
}

export function notificationRoute(data: unknown): Href {
  const category =
    data && typeof data === 'object' && 'category' in data
      ? (data as { category?: unknown }).category
      : undefined;

  switch (category) {
    case 'selected':
      return '/(selection)/invitation';
    case 'answered':
    case 'anniversary': {
      const drawId = routeDrawId(data);
      return drawId
        ? ({ pathname: '/human/[id]', params: { id: drawId } } as const)
        : '/(tabs)/archive';
    }
    case 'daily':
    default:
      return '/(tabs)';
  }
}
