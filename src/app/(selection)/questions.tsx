import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { Toast } from '@/components/ui/Toast';
import { useQuestions } from '@/features/daily-human/hooks';
import {
  useAnswerQuestion,
  useHumanJourney,
} from '@/features/selection/journeyApi';
import type { PublicQuestionRow } from '@/lib/supabase/types';
import { useTheme } from '@/theme';

const MAX_ANSWER = 2000;

function AnswerCard({
  drawId,
  question,
  onSaved,
}: {
  drawId: string;
  question: PublicQuestionRow;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const answerQuestion = useAnswerQuestion(drawId);
  const [answer, setAnswer] = useState(question.answer ?? '');
  const [error, setError] = useState<string>();

  const trimmed = answer.trim();
  const unchanged = trimmed === (question.answer ?? '');

  return (
    <Surface style={{ gap: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="title3">{question.body}</Text>
        <Text color="textTertiary" variant="footnote">
          {t('journey.votes', { count: question.votes })}
        </Text>
      </View>

      <TextField
        error={error}
        hint={t('journey.answerHint')}
        label={t('journey.yourAnswer')}
        maxLength={MAX_ANSWER}
        multiline
        onChangeText={setAnswer}
        placeholder={t('journey.answerPlaceholder')}
        value={answer}
      />

      <View style={{ gap: theme.spacing.sm }}>
        <Text color="textTertiary" variant="caption">
          {t('journey.characters', {
            count: MAX_ANSWER - answer.length,
          })}
        </Text>
        <Button
          disabled={!trimmed || unchanged || answerQuestion.isPending}
          icon="send"
          label={
            question.answer
              ? t('journey.updateAnswer')
              : t('journey.saveAnswer')
          }
          onPress={() => {
            setError(undefined);
            answerQuestion.mutate(
              { questionId: question.id, answer: trimmed },
              {
                onSuccess: onSaved,
                onError: () => setError(t('journey.answerFailed')),
              }
            );
          }}
        />
      </View>
    </Surface>
  );
}

export default function AnswerQuestionsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: journey, isLoading: journeyLoading } = useHumanJourney();
  const live = journey?.action === 'answer-questions';
  const { data: questions, isLoading: questionsLoading } = useQuestions(
    live ? journey.drawId : undefined
  );
  const [saved, setSaved] = useState(false);

  if (journeyLoading || questionsLoading) {
    return (
      <Screen>
        <Skeleton height={90} radius={theme.radius.xl} />
        <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing.xl }}>
          <Skeleton height={250} radius={theme.radius.xl} />
          <Skeleton height={250} radius={theme.radius.xl} />
        </View>
      </Screen>
    );
  }

  if (!journey || !live) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <Screen>
          <EmptyState
            action={{
              label: t('journey.viewStatus'),
              onPress: () => router.replace('/(selection)/status'),
            }}
            body={t('journey.notLiveBody')}
            icon="clock"
            title={t('journey.notLive')}
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <Screen>
        <PageHeader
          eyebrow={t('journey.eyebrow')}
          subtitle={t('journey.answerIntro')}
          title={t('journey.answerTitle')}
        />

        <Surface tone="warm" style={{ gap: theme.spacing.sm }}>
          <Text variant="title3">{t('journey.optionalTitle')}</Text>
          <Text color="textSecondary">{t('journey.optionalBody')}</Text>
        </Surface>

        <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing.xl }}>
          {questions && questions.length > 0 ? (
            questions.map((question) => (
              <AnswerCard
                drawId={journey.drawId}
                key={question.id}
                onSaved={() => setSaved(true)}
                question={question}
              />
            ))
          ) : (
            <EmptyState
              body={t('journey.noQuestionsBody')}
              icon="message-circle"
              title={t('journey.noQuestions')}
            />
          )}
        </View>
      </Screen>

      <Toast
        message={t('journey.answerSaved')}
        onDismiss={() => setSaved(false)}
        tone="success"
        visible={saved}
      />
    </>
  );
}
