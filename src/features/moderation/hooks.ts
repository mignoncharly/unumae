import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useIsAuthenticated } from '@/features/auth/useSession';

import {
  amIModerator,
  getPortraitQueue,
  getQuestionQueue,
  getReportQueue,
  reportContent,
  resolveReport,
  reviewPortrait,
  reviewQuestion,
  setAccountStatus,
  setBlocked,
} from './api';

export const moderationKeys = {
  amIModerator: ['am-i-moderator'] as const,
  portraits: ['moderation-portraits'] as const,
  questions: ['moderation-questions'] as const,
  reports: ['moderation-reports'] as const,
};

export function useAmIModerator() {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: moderationKeys.amIModerator,
    queryFn: amIModerator,
    enabled: isAuthenticated,
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * The queues are short and time-sensitive — a portrait waiting on review is
 * holding up a cycle — so they are refetched more eagerly than anything else
 * in the app.
 */
const QUEUE_STALE_TIME = 30 * 1000;

export function usePortraitQueue(enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.portraits,
    queryFn: getPortraitQueue,
    enabled,
    staleTime: QUEUE_STALE_TIME,
  });
}

export function useQuestionQueue(enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.questions,
    queryFn: getQuestionQueue,
    enabled,
    staleTime: QUEUE_STALE_TIME,
  });
}

export function useReportQueue(enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.reports,
    queryFn: getReportQueue,
    enabled,
    staleTime: QUEUE_STALE_TIME,
  });
}

export function useModerationActions() {
  const queryClient = useQueryClient();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: moderationKeys.portraits });
    void queryClient.invalidateQueries({ queryKey: moderationKeys.questions });
    void queryClient.invalidateQueries({ queryKey: moderationKeys.reports });
  };

  return {
    portrait: useMutation({
      mutationFn: (input: Parameters<typeof reviewPortrait>) =>
        reviewPortrait(...input),
      onSuccess: refresh,
    }),
    question: useMutation({
      mutationFn: (input: Parameters<typeof reviewQuestion>) =>
        reviewQuestion(...input),
      onSuccess: refresh,
    }),
    report: useMutation({
      mutationFn: (input: Parameters<typeof resolveReport>) =>
        resolveReport(...input),
      onSuccess: refresh,
    }),
    account: useMutation({
      mutationFn: (input: Parameters<typeof setAccountStatus>) =>
        setAccountStatus(...input),
      onSuccess: refresh,
    }),
  };
}

export function useReport() {
  return useMutation({
    mutationFn: (input: Parameters<typeof reportContent>) =>
      reportContent(...input),
  });
}

export function useBlock() {
  return useMutation({
    mutationFn: ({ userId, blocked }: { userId: string; blocked: boolean }) =>
      setBlocked(userId, blocked),
  });
}
