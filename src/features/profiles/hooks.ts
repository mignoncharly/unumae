import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';

import {
  amIFounding,
  createMyProfile,
  getMyProfile,
  updateMyProfile,
} from './api';
import type { CreateProfileInput, UpdateProfileInput } from './schema';

export const profileKeys = {
  me: (userId: string) => ['profile', userId] as const,
};

export function useMyProfile() {
  const session = useSession();
  const userId = session.session?.user.id;

  return useQuery({
    queryKey: profileKeys.me(userId ?? 'anonymous'),
    queryFn: () => getMyProfile(userId!),
    enabled: Boolean(userId),
    // Moderation can change account_status while this client is open. Polling
    // keeps the global account gate current even before Auth revocation lands.
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useCreateProfile() {
  const session = useSession();
  const queryClient = useQueryClient();
  const userId = session.session?.user.id;

  return useMutation({
    mutationFn: (input: CreateProfileInput) => createMyProfile(userId!, input),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.me(profile.id), profile);
    },
  });
}

export function useUpdateProfile() {
  const session = useSession();
  const queryClient = useQueryClient();
  const userId = session.session?.user.id;

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateMyProfile(userId!, input),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.me(profile.id), profile);
    },
  });
}

/**
 * True when the user is signed in but has not finished onboarding.
 * Deliberately not a redirect: a guest with no profile is simply a guest.
 */
export function useNeedsOnboarding(): boolean {
  const session = useSession();
  const { data, isLoading } = useMyProfile();

  return session.status === 'authenticated' && !isLoading && data === null;
}

/**
 * Am I a Founding Human?
 *
 * Answers about you and nobody else — the database function takes no argument.
 * It changes at most once, when Year Zero closes, so it is cached for a day.
 */
export function useAmIFounding() {
  const session = useSession();
  const userId = session.session?.user.id ?? 'anonymous';

  return useQuery({
    queryKey: ['am-i-founding', userId] as const,
    queryFn: amIFounding,
    enabled: session.status === 'authenticated',
    staleTime: 24 * 60 * 60 * 1000,
  });
}
