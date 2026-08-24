import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';

import {
  blockContentAuthor,
  getAppealableDecisions,
  getArchiveRemovalOptions,
  getBlockedUsers,
  requestArchiveRemoval,
  submitAppeal,
  unblockById,
} from './api';

export const privacyKeys = {
  blocked: (userId: string) => ['privacy', userId, 'blocked'] as const,
  appeals: (userId: string) => ['privacy', userId, 'appeals'] as const,
  archiveRemoval: (userId: string) =>
    ['privacy', userId, 'archive-removal'] as const,
};

function useUserId() {
  const session = useSession();
  return session.session?.user.id;
}

export function useBlockContentAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof blockContentAuthor>) =>
      blockContentAuthor(...input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['todays-human'] });
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
      void queryClient.invalidateQueries({ queryKey: ['archive'] });
      void queryClient.invalidateQueries({ queryKey: ['archive-human'] });
      void queryClient.invalidateQueries({ queryKey: ['privacy'] });
    },
  });
}

export function useBlockedUsers() {
  const userId = useUserId();
  return useQuery({
    queryKey: privacyKeys.blocked(userId ?? 'anonymous'),
    queryFn: getBlockedUsers,
    enabled: Boolean(userId),
  });
}

export function useUnblock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unblockById,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['privacy'] });
      void queryClient.invalidateQueries({ queryKey: ['todays-human'] });
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
      void queryClient.invalidateQueries({ queryKey: ['archive'] });
      void queryClient.invalidateQueries({ queryKey: ['archive-human'] });
    },
  });
}

export function useAppealableDecisions() {
  const userId = useUserId();
  return useQuery({
    queryKey: privacyKeys.appeals(userId ?? 'anonymous'),
    queryFn: getAppealableDecisions,
    enabled: Boolean(userId),
  });
}

export function useSubmitAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof submitAppeal>) =>
      submitAppeal(...input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['privacy'] }),
  });
}

export function useArchiveRemovalOptions() {
  const userId = useUserId();
  return useQuery({
    queryKey: privacyKeys.archiveRemoval(userId ?? 'anonymous'),
    queryFn: getArchiveRemovalOptions,
    enabled: Boolean(userId),
  });
}

export function useRequestArchiveRemoval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof requestArchiveRemoval>) =>
      requestArchiveRemoval(...input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['privacy'] }),
  });
}
