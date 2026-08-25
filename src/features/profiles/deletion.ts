import type { DeletionRequestState } from '@/lib/supabase/types';

export const RECENT_AUTHENTICATION_MS = 15 * 60 * 1000;

export function hasRecentAuthentication(
  lastSignInAt: string | undefined,
  now = Date.now()
): boolean {
  if (!lastSignInAt) return false;
  const signedInAt = Date.parse(lastSignInAt);
  return (
    Number.isFinite(signedInAt) &&
    signedInAt <= now &&
    now - signedInAt <= RECENT_AUTHENTICATION_MS
  );
}

export function isDeletionTerminal(state: DeletionRequestState): boolean {
  return state === 'completed' || state === 'manual_review';
}

export function isProfilelessAccountRoute(pathname: string): boolean {
  return pathname === '/profile' || pathname === '/settings/account';
}
