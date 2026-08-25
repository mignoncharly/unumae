import type { AccountStatus } from '@/lib/supabase/types';

export function isRestrictedAccountStatus(status: AccountStatus): boolean {
  return status !== 'active';
}

export function isRestrictedRoute(segments: readonly string[]): boolean {
  return (
    segments[0] === 'settings' &&
    ['restricted', 'appeals', 'account'].includes(segments[1] ?? '')
  );
}
