import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';
import { todayKeys } from '@/features/daily-human/hooks';
import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';

import { toHumanJourney, type HumanJourney } from './journey';

export const journeyKeys = {
  all: ['human-journey'] as const,
  current: (userId: string) => ['human-journey', userId] as const,
};

export async function fetchMyHumanJourney(): Promise<HumanJourney | null> {
  const { data, error } = await getSupabase().rpc('my_human_journey');

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }

  return data?.[0] ? toHumanJourney(data[0]) : null;
}

export function useHumanJourney() {
  const session = useSession();
  const userId = session.session?.user.id;

  return useQuery({
    queryKey: journeyKeys.current(userId ?? 'anonymous'),
    queryFn: fetchMyHumanJourney,
    enabled: session.status === 'authenticated',
    staleTime: 30 * 1000,
  });
}

export async function answerQuestion(
  questionId: string,
  answer: string
): Promise<void> {
  const { data, error } = await getSupabase().rpc('answer_question', {
    target_question: questionId,
    answer_body: answer.trim(),
  });

  if (error || !data) {
    throw new AppError('validation', 'journey.answerFailed', { cause: error });
  }
}

export function useAnswerQuestion(drawId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      answer,
    }: {
      questionId: string;
      answer: string;
    }) => answerQuestion(questionId, answer),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: todayKeys.questions(drawId ?? 'none'),
      });
    },
  });
}
