import type { Href } from 'expo-router';

// Article 10 of the plan: the user controls every notification category.

export type NotificationCategory =
  'daily' | 'selected' | 'answered' | 'anniversary';

export function notificationRoute(data: unknown): Href {
  const category =
    data && typeof data === 'object' && 'category' in data
      ? (data as { category?: unknown }).category
      : undefined;

  switch (category) {
    case 'selected':
      return '/(selection)/invitation';
    case 'anniversary':
      return '/(tabs)/archive';
    case 'answered':
    case 'daily':
    default:
      return '/(tabs)';
  }
}
