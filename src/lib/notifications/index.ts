import type { Href } from 'expo-router';

// Article 10 of the plan: the user controls every notification category.

export type NotificationCategory =
  'daily' | 'selected' | 'answered' | 'anniversary';

export const SELECTION_NOTIFICATION_CATEGORY = 'selection_invitation';
export const ACCEPT_SELECTION_ACTION = 'accept_selection';
export const DECLINE_SELECTION_ACTION = 'decline_selection';

export type NotificationDestination =
  'today' | 'invitation' | 'human' | 'archive';

export function notificationCategory(
  data: unknown
): NotificationCategory | 'unknown' {
  const category =
    data && typeof data === 'object' && 'category' in data
      ? (data as { category?: unknown }).category
      : undefined;

  return category === 'daily' ||
    category === 'selected' ||
    category === 'answered' ||
    category === 'anniversary'
    ? category
    : 'unknown';
}

export function notificationInvitationId(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('invitationId' in data)) {
    return null;
  }
  const value = (data as { invitationId?: unknown }).invitationId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function notificationDestination(
  data: unknown
): NotificationDestination {
  switch (notificationCategory(data)) {
    case 'selected':
      return 'invitation';
    case 'answered':
    case 'anniversary':
      return routeDrawId(data) ? 'human' : 'archive';
    case 'daily':
    case 'unknown':
    default:
      return 'today';
  }
}

export function notificationAction(
  action: string
): 'default' | 'accept' | 'decline' | 'other' {
  if (action === ACCEPT_SELECTION_ACTION) return 'accept';
  if (action === DECLINE_SELECTION_ACTION) return 'decline';
  if (action.toLowerCase().includes('default')) return 'default';
  return 'other';
}

function routeDrawId(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('drawId' in data)) {
    return null;
  }
  const drawId = (data as { drawId?: unknown }).drawId;
  return typeof drawId === 'string' && drawId.length > 0 ? drawId : null;
}

export function notificationRoute(data: unknown): Href {
  const category = notificationCategory(data);

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
