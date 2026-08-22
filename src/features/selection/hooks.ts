import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';
import { useMyProfile } from '@/features/profiles/hooks';
import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';

import { evaluateEligibility, type Eligibility } from './eligibility';

/**
 * Whether the caller has already been Today's Human.
 *
 * Goes through an RPC because `daily_draws.selected_user_id` is granted to no
 * client role at all — a pending draw must never be readable, or anyone could
 * recompute the ordering and learn tomorrow's human before they do.
 */
async function fetchHasBeenSelected(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('has_been_selected');

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }

  return data ?? false;
}

export function useHasBeenSelected() {
  const session = useSession();

  return useQuery({
    queryKey: ['has-been-selected', session.session?.user.id ?? 'anonymous'],
    queryFn: fetchHasBeenSelected,
    enabled: session.status === 'authenticated',
    // Changes at most once in a lifetime (Article 5.4).
    staleTime: 60 * 60 * 1000,
  });
}

export function useEligibility(): {
  eligibility: Eligibility;
  loading: boolean;
} {
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: hasBeenSelected, isLoading: selectedLoading } =
    useHasBeenSelected();

  return {
    eligibility: evaluateEligibility({
      profile: profile ?? null,
      hasBeenSelected: hasBeenSelected ?? false,
    }),
    loading: profileLoading || selectedLoading,
  };
}
