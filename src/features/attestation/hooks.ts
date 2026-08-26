import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';
import { profileKeys } from '@/features/profiles/hooks';

import { attestCurrentDevice, requestAttestationReview } from './api';

export function useDeviceAttestation() {
  const session = useSession();
  const queryClient = useQueryClient();
  const userId = session.session?.user.id;

  const refreshProfile = () => {
    if (userId) {
      void queryClient.invalidateQueries({ queryKey: profileKeys.me(userId) });
    }
    void queryClient.invalidateQueries({ queryKey: ['has-been-selected'] });
  };

  const attest = useMutation({
    mutationFn: () => attestCurrentDevice(userId!),
    onSuccess: refreshProfile,
  });
  const requestReview = useMutation({
    mutationFn: requestAttestationReview,
    onSuccess: refreshProfile,
  });

  return { attest, requestReview };
}
