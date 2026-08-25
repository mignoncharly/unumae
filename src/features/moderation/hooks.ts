import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';

import {
  amIModerator,
  getAccountAssuranceReviewQueue,
  getAppealQueue,
  getArchiveRemovalQueue,
  getCountryBalance,
  getGrowthGate,
  getIntegritySignals,
  getJobHistory,
  getJourneyFunnels,
  getModerationHealth,
  getNotificationAttribution,
  getOperationalAlerts,
  getParticipationMix,
  getPortraitQueue,
  getQuestionQueue,
  getReportQueue,
  getRetentionCohorts,
  reportContent,
  resolveOperationalAlert,
  resolveReport,
  reviewAppeal,
  reviewAccountFlag,
  reviewArchiveRemoval,
  reviewPortrait,
  reviewQuestion,
  setAccountStatus,
} from './api';

export const moderationKeys = {
  root: (userId: string) => ['moderation', userId] as const,
  amIModerator: (userId: string) =>
    ['moderation', userId, 'is-moderator'] as const,
  portraits: (userId: string) => ['moderation', userId, 'portraits'] as const,
  questions: (userId: string) => ['moderation', userId, 'questions'] as const,
  reports: (userId: string) => ['moderation', userId, 'reports'] as const,
  assurance: (userId: string) => ['moderation', userId, 'assurance'] as const,
  appeals: (userId: string) => ['moderation', userId, 'appeals'] as const,
  removals: (userId: string) => ['moderation', userId, 'removals'] as const,
  cohorts: (userId: string) => ['moderation', userId, 'cohorts'] as const,
  participation: (userId: string) =>
    ['moderation', userId, 'participation'] as const,
  gate: (userId: string) => ['moderation', userId, 'gate'] as const,
  funnels: (userId: string) => ['moderation', userId, 'funnels'] as const,
  notificationAttribution: (userId: string) =>
    ['moderation', userId, 'notification-attribution'] as const,
  countryBalance: (userId: string) =>
    ['moderation', userId, 'country-balance'] as const,
  integrity: (userId: string) => ['moderation', userId, 'integrity'] as const,
  health: (userId: string) => ['moderation', userId, 'health'] as const,
  jobs: (userId: string) => ['moderation', userId, 'jobs'] as const,
  alerts: (userId: string) => ['moderation', userId, 'alerts'] as const,
};

function useModeratorUserId(): string {
  return useSession().session?.user.id ?? 'anonymous';
}

export function useAmIModerator() {
  const session = useSession();
  const userId = session.session?.user.id ?? 'anonymous';

  return useQuery({
    queryKey: moderationKeys.amIModerator(userId),
    queryFn: amIModerator,
    enabled: session.status === 'authenticated',
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
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.portraits(userId),
    queryFn: getPortraitQueue,
    enabled,
    staleTime: QUEUE_STALE_TIME,
  });
}

export function useQuestionQueue(enabled: boolean) {
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.questions(userId),
    queryFn: getQuestionQueue,
    enabled,
    staleTime: QUEUE_STALE_TIME,
  });
}

export function useReportQueue(enabled: boolean) {
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.reports(userId),
    queryFn: getReportQueue,
    enabled,
    staleTime: QUEUE_STALE_TIME,
  });
}

export function useAccountAssuranceReviewQueue(enabled: boolean) {
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.assurance(userId),
    queryFn: getAccountAssuranceReviewQueue,
    enabled,
    staleTime: QUEUE_STALE_TIME,
  });
}

export function useModerationActions() {
  const queryClient = useQueryClient();
  const userId = useModeratorUserId();

  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: moderationKeys.root(userId),
    });
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
    assurance: useMutation({
      mutationFn: (input: Parameters<typeof reviewAccountFlag>) =>
        reviewAccountFlag(...input),
      onSuccess: refresh,
    }),
    account: useMutation({
      mutationFn: (input: Parameters<typeof setAccountStatus>) =>
        setAccountStatus(...input),
      onSuccess: refresh,
    }),
    appeal: useMutation({
      mutationFn: (input: Parameters<typeof reviewAppeal>) =>
        reviewAppeal(...input),
      onSuccess: refresh,
    }),
    removal: useMutation({
      mutationFn: (input: Parameters<typeof reviewArchiveRemoval>) =>
        reviewArchiveRemoval(...input),
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

export function useAppealQueue(enabled: boolean) {
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.appeals(userId),
    queryFn: getAppealQueue,
    enabled,
    staleTime: QUEUE_STALE_TIME,
  });
}

export function useArchiveRemovalQueue(enabled: boolean) {
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.removals(userId),
    queryFn: getArchiveRemovalQueue,
    enabled,
    staleTime: QUEUE_STALE_TIME,
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
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.cohorts(userId),
    queryFn: () => getRetentionCohorts(),
    enabled,
    staleTime: SIGNALS_STALE_TIME,
  });
}

export function useParticipationMix(enabled: boolean) {
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.participation(userId),
    queryFn: () => getParticipationMix(),
    enabled,
    staleTime: SIGNALS_STALE_TIME,
  });
}

export function useGrowthGate(enabled: boolean) {
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.gate(userId),
    queryFn: () => getGrowthGate(),
    enabled,
    staleTime: SIGNALS_STALE_TIME,
  });
}

export function useJourneyFunnels(enabled: boolean) {
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.funnels(userId),
    queryFn: () => getJourneyFunnels(),
    enabled,
    staleTime: SIGNALS_STALE_TIME,
  });
}

export function useNotificationAttribution(enabled: boolean) {
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.notificationAttribution(userId),
    queryFn: () => getNotificationAttribution(),
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
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.countryBalance(userId),
    queryFn: getCountryBalance,
    enabled,
    staleTime: SIGNALS_STALE_TIME,
  });
}

export function useIntegritySignals(enabled: boolean) {
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.integrity(userId),
    queryFn: getIntegritySignals,
    enabled,
    staleTime: SIGNALS_STALE_TIME,
  });
}

/** Refetched more eagerly: a portrait waiting is a cycle waiting. */
export function useModerationHealth(enabled: boolean) {
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.health(userId),
    queryFn: getModerationHealth,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useJobHistory(enabled: boolean) {
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.jobs(userId),
    queryFn: getJobHistory,
    enabled,
    staleTime: SIGNALS_STALE_TIME,
  });
}

/** Active failures are operational, so poll rather than caching for an hour. */
export function useOperationalAlerts(enabled: boolean) {
  const userId = useModeratorUserId();
  return useQuery({
    queryKey: moderationKeys.alerts(userId),
    queryFn: getOperationalAlerts,
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: enabled ? 30 * 1000 : false,
  });
}

export function useResolveOperationalAlert() {
  const queryClient = useQueryClient();
  const userId = useModeratorUserId();
  return useMutation({
    mutationFn: resolveOperationalAlert,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: moderationKeys.alerts(userId),
      }),
  });
}
