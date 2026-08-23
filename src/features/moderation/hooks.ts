import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useIsAuthenticated } from '@/features/auth/useSession';

import {
  amIModerator,
  getCountryBalance,
  getGrowthGate,
  getIntegritySignals,
  getJobHistory,
  getModerationHealth,
  getOperationalAlerts,
  getParticipationMix,
  getPortraitQueue,
  getQuestionQueue,
  getReportQueue,
  getRetentionCohorts,
  reportContent,
  resolveReport,
  resolveOperationalAlert,
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
  cohorts: ['moderation-cohorts'] as const,
  participation: ['moderation-participation'] as const,
  gate: ['moderation-gate'] as const,
  countryBalance: ['moderation-country-balance'] as const,
  integrity: ['moderation-integrity'] as const,
  health: ['moderation-health'] as const,
  jobs: ['moderation-jobs'] as const,
  alerts: ['moderation-operational-alerts'] as const,
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

/**
 * Signals.
 *
 * Slow-moving by nature — a cohort's D7 cannot change more than once a day —
 * so these are cached for an hour. Nobody needs to watch retention update live,
 * and a number that flickers invites the kind of staring that this product is
 * built to avoid.
 */
const SIGNALS_STALE_TIME = 60 * 60 * 1000;

export function useRetentionCohorts(enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.cohorts,
    queryFn: () => getRetentionCohorts(),
    enabled,
    staleTime: SIGNALS_STALE_TIME,
  });
}

export function useParticipationMix(enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.participation,
    queryFn: () => getParticipationMix(),
    enabled,
    staleTime: SIGNALS_STALE_TIME,
  });
}

export function useGrowthGate(enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.gate,
    queryFn: () => getGrowthGate(),
    enabled,
    staleTime: SIGNALS_STALE_TIME,
  });
}

/**
 * The Phase 16 instruments.
 *
 * Cached for an hour like the other signals. Country drift and queue age move
 * on the scale of days, and a number that flickers invites the kind of watching
 * this product exists to avoid.
 */
export function useCountryBalance(enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.countryBalance,
    queryFn: getCountryBalance,
    enabled,
    staleTime: SIGNALS_STALE_TIME,
  });
}

export function useIntegritySignals(enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.integrity,
    queryFn: getIntegritySignals,
    enabled,
    staleTime: SIGNALS_STALE_TIME,
  });
}

/** Refetched more eagerly: a portrait waiting is a cycle waiting. */
export function useModerationHealth(enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.health,
    queryFn: getModerationHealth,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useJobHistory(enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.jobs,
    queryFn: getJobHistory,
    enabled,
    staleTime: SIGNALS_STALE_TIME,
  });
}

/** Active failures are operational, so poll rather than caching for an hour. */
export function useOperationalAlerts(enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.alerts,
    queryFn: getOperationalAlerts,
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: enabled ? 30 * 1000 : false,
  });
}

export function useResolveOperationalAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveOperationalAlert,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: moderationKeys.alerts }),
  });
}
