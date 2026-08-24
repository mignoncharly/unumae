import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';
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
  human: (viewer: string) => ['todays-human', viewer] as const,
  questions: (drawId: string, viewer: string) =>
    ['questions', drawId, viewer] as const,
  remembered: (drawId: string, userId: string) =>
    ['remembered', drawId, userId] as const,
};

function useViewer() {
  const session = useSession();
  return {
    key: session.session?.user.id ?? 'guest',
    ready: session.status !== 'loading',
  };
}

export function useTodaysHuman() {
  const viewer = useViewer();
  return useQuery({
    queryKey: todayKeys.human(viewer.key),
    queryFn: getTodaysHuman,
    // Persisted data may hydrate before the boundary refetch completes. Never
    // render yesterday's person as Today during that short window.
    select: (today) =>
      today?.human.selection_date === getCycleDate() ? today : null,
    // The cycle changes once a day. Nothing here rewards polling.
    staleTime: 5 * 60 * 1000,
    enabled: viewer.ready,
  });
}

export function useQuestions(drawId: string | undefined) {
  const viewer = useViewer();
  return useQuery({
    queryKey: todayKeys.questions(drawId ?? 'none', viewer.key),
    queryFn: () => getQuestions(drawId!),
    enabled: Boolean(drawId) && viewer.ready,
    staleTime: 30 * 1000,
  });
}

export function useRemembered(drawId: string | undefined) {
  const session = useSession();
  const userId = session.session?.user.id ?? 'anonymous';

  return useQuery({
    queryKey: todayKeys.remembered(drawId ?? 'none', userId),
    queryFn: () => doIRemember(drawId!),
    enabled: Boolean(drawId) && session.status === 'authenticated',
  });
}

export function useAskQuestion(drawId: string | undefined) {
  const queryClient = useQueryClient();
  const viewer = useViewer();

  return useMutation({
    mutationFn: (body: string) => askQuestion(drawId!, body),
    onSuccess: () => {
      // The new question is not visible yet: it is moderated first
      // (Article 8.1). Refetching anyway keeps the list honest if it was.
      void queryClient.invalidateQueries({
        queryKey: todayKeys.questions(drawId ?? 'none', viewer.key),
      });
    },
  });
}

export function useVote(drawId: string | undefined) {
  const queryClient = useQueryClient();
  const viewer = useViewer();

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
        queryKey: todayKeys.questions(drawId ?? 'none', viewer.key),
      });
    },
  });
}

export function useRemember(drawId: string | undefined) {
  const queryClient = useQueryClient();
  const session = useSession();
  const userId = session.session?.user.id ?? 'anonymous';

  return useMutation({
    mutationFn: (remembered: boolean) => setRemembered(drawId!, remembered),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: todayKeys.remembered(drawId ?? 'none', userId),
      });
    },
  });
}
