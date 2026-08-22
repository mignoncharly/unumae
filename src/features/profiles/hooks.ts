import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';

import { createMyProfile, getMyProfile, updateMyProfile } from './api';
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
    // A profile changes when its owner changes it, and never otherwise.
    staleTime: 5 * 60 * 1000,
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
