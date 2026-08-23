import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useIsAuthenticated } from '@/features/auth/useSession';
import { getCycleDate } from '@/utils/cycle';

import {
  askQuestion,
  doIRemember,
  getQuestions,
  getTodaysHuman,
  setRemembered,
  setVote,
} from './api';

export const todayKeys = {
  human: ['todays-human'] as const,
  questions: (drawId: string) => ['questions', drawId] as const,
  remembered: (drawId: string) => ['remembered', drawId] as const,
};

export function useTodaysHuman() {
  return useQuery({
    queryKey: todayKeys.human,
    queryFn: getTodaysHuman,
    // Persisted data may hydrate before the boundary refetch completes. Never
    // render yesterday's person as Today during that short window.
    select: (today) =>
      today?.human.selection_date === getCycleDate() ? today : null,
    // The cycle changes once a day. Nothing here rewards polling.
    staleTime: 5 * 60 * 1000,
  });
}

export function useQuestions(drawId: string | undefined) {
  return useQuery({
    queryKey: todayKeys.questions(drawId ?? 'none'),
    queryFn: () => getQuestions(drawId!),
    enabled: Boolean(drawId),
    staleTime: 30 * 1000,
  });
}

export function useRemembered(drawId: string | undefined) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: todayKeys.remembered(drawId ?? 'none'),
    queryFn: () => doIRemember(drawId!),
    enabled: Boolean(drawId) && isAuthenticated,
  });
}

export function useAskQuestion(drawId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => askQuestion(drawId!, body),
    onSuccess: () => {
      // The new question is not visible yet: it is moderated first
      // (Article 8.1). Refetching anyway keeps the list honest if it was.
      void queryClient.invalidateQueries({
        queryKey: todayKeys.questions(drawId ?? 'none'),
      });
    },
  });
}

export function useVote(drawId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      voted,
    }: {
      questionId: string;
      voted: boolean;
    }) => setVote(questionId, voted),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: todayKeys.questions(drawId ?? 'none'),
      });
    },
  });
}

export function useRemember(drawId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (remembered: boolean) => setRemembered(drawId!, remembered),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: todayKeys.remembered(drawId ?? 'none'),
      });
    },
  });
}
