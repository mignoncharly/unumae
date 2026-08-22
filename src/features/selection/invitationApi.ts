import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';
import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';

import type { PendingInvitation } from './invitation';

/**
 * The candidate's side of the acceptance window.
 *
 * Every call is an RPC because the state machine lives in the database. A
 * client that could write `daily_draws` directly could publish itself, so it
 * cannot: it may only answer a question it was asked.
 */

async function fetchPendingInvitation(): Promise<PendingInvitation | null> {
  const { data, error } = await getSupabase().rpc('my_pending_invitation');

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }

  const row = data?.[0];
  if (!row) {
    return null;
  }

  return {
    invitationId: row.invitation_id,
    selectionDate: row.selection_date,
    notifiedAt: row.notified_at,
    acceptanceDeadline: row.acceptance_deadline,
  };
}

export const invitationKeys = {
  pending: (userId: string) => ['invitation', userId] as const,
};

export function usePendingInvitation() {
  const session = useSession();
  const userId = session.session?.user.id;

  return useQuery({
    queryKey: invitationKeys.pending(userId ?? 'anonymous'),
    queryFn: fetchPendingInvitation,
    enabled: session.status === 'authenticated',
    // Being asked is rare and time-limited; a minute of staleness is fine and
    // polling harder would not make anyone answer faster.
    staleTime: 60 * 1000,
  });
}

export function useAnswerInvitation() {
  const session = useSession();
  const queryClient = useQueryClient();
  const userId = session.session?.user.id ?? 'anonymous';

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: invitationKeys.pending(userId) });

  const accept = useMutation({
    mutationFn: async () => {
      const { data, error } = await getSupabase().rpc('accept_selection');
      if (error) {
        throw new AppError('unknown', 'invitation.acceptFailed', {
          cause: error,
        });
      }
      // False means the window closed while the screen was open. The next
      // candidate has already been asked, so this cannot be retried.
      if (!data) {
        throw new AppError('unknown', 'invitation.tooLate');
      }
      return data;
    },
    onSuccess: invalidate,
  });

  const decline = useMutation({
    mutationFn: async () => {
      const { data, error } = await getSupabase().rpc('decline_selection');
      if (error) {
        throw new AppError('unknown', 'invitation.declineFailed', {
          cause: error,
        });
      }
      return data;
    },
    onSuccess: invalidate,
  });

  return { accept, decline };
}
