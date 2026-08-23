import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { HumanPortrait } from '@/components/human/HumanPortrait';
import { YourStanding } from '@/components/human/YourStanding';
import { AskSheet } from '@/components/questions/AskSheet';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { ReportAction } from '@/components/shared/ReportAction';
import { ShareButton } from '@/components/sharing/ShareButton';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { useIsAuthenticated } from '@/features/auth/useSession';
import {
  useAskQuestion,
  useQuestions,
  useRemember,
  useRemembered,
  useTodaysHuman,
  useVote,
} from '@/features/daily-human/hooks';
import { useReport } from '@/features/moderation/hooks';
import { track } from '@/lib/analytics';
import { useTheme } from '@/theme';
import { countryName, flagEmoji } from '@/utils/country';

/**
 * TODAY — the core of the application.
 *
 * A guest reads all of this. An account is needed only to ask, vote and
 * Remember (Article 6.1), and the prompts to sign in appear at the moment
 * somebody tries to act, never on arrival.
 *
 * The screen ends. There is no infinite scroll, no "next human", and no
 * suggestion of anyone else to look at (Article 1.7).
 */
export default function TodayScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isAuthenticated = useIsAuthenticated();

  const { data: today, isLoading } = useTodaysHuman();
  const drawId = today?.human.draw_id;

  const { data: questions } = useQuestions(drawId);
  const { data: remembered } = useRemembered(drawId);
  const ask = useAskQuestion(drawId);
  const remember = useRemember(drawId);
  const vote = useVote(drawId);
  const report = useReport();

  const [askOpen, setAskOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    track('today_viewed');
  }, []);

  function requireAccount(action: () => void) {
    if (!isAuthenticated) {
      router.push('/(auth)/sign-in');
      return;
    }
    action();
  }

  if (isLoading) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing.xxl }}>
          <Skeleton height={20} width="40%" />
          <Skeleton height={44} width="70%" />
          <Skeleton height={280} />
          <Skeleton />
          <Skeleton width="85%" />
        </View>
      </Screen>
    );
  }

  // No live cycle. Article 5.8 calls this a Quiet Day and says to be honest
  // about it rather than showing yesterday's human again.
  if (!today) {
    return (
      <Screen>
        <EmptyState
          action={{
            label: t('today.meetRandom'),
            onPress: () => router.push('/archive'),
          }}
          body={t('today.quietDayBody')}
          title={t('today.quietDay')}
        />

        {/*
          Here more than anywhere. A Quiet Day is the emptiest this screen ever
          gets, and "you join the draw in six days" is the most useful thing the
          person reading it could be told — which is exactly why it was a
          mistake to put the standing line only on the branch where a Human
          exists.
        */}
        <YourStanding centered />
      </Screen>
    );
  }

  return (
    <>
      <Screen>
        <HumanPortrait
          city={today.human.city}
          countryCode={today.human.country_code}
          elements={today.elements.map((element) => ({
            id: element.key,
            prompt: t(`portrait.prompts.${element.key}.label`),
            answer: element.answer,
          }))}
          founding={today.human.founding}
          humanNumber={today.human.human_number ?? 0}
          name={today.human.display_name}
          photoUri={today.photoUrl}
          showTimer
        />

        <View style={{ marginTop: theme.spacing.huge, gap: theme.spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text color="textTertiary" variant="footnote">
              {t('questions.title').toUpperCase()}
            </Text>
            <Button
              label={t('questions.ask')}
              onPress={() => requireAccount(() => setAskOpen(true))}
              variant="secondary"
            />
          </View>

          {questions && questions.length > 0 ? (
            questions.map((question) => (
              <QuestionCard
                answer={question.answer}
                canVote
                hasVoted={question.has_voted ?? false}
                key={question.id}
                onVote={() =>
                  requireAccount(() => {
                    // Pressing again removes your own vote. That is the only
                    // other thing a person can do — there is no opposite.
                    const voted = !(question.has_voted ?? false);
                    vote.mutate({ questionId: question.id, voted });
                    track('question_voted');
                    if (voted) {
                      setToast(t('questions.voted'));
                    }
                  })
                }
                question={question.body}
                votes={question.votes}
              />
            ))
          ) : (
            <Text color="textSecondary">{t('questions.empty')}</Text>
          )}
        </View>

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.lg }}>
          {/*
            No count, here or anywhere. Remember is a private library, and the
            number of people who kept someone is not a score (Article 9.4).
          */}
          <Button
            label={remembered ? t('remember.remembered') : t('remember.action')}
            onPress={() =>
              requireAccount(() => {
                remember.mutate(!remembered);
                track('human_remembered');
                setToast(
                  remembered ? t('remember.removed') : t('remember.added')
                );
              })
            }
            variant={remembered ? 'secondary' : 'primary'}
          />

          {/*
            Sharing is the only growth mechanism this product has, and the only
            one it is allowed: a person passing on somebody they found worth
            passing on (Article 1.8).
          */}
          <ShareButton
            human={{
              humanNumber: today.human.human_number ?? 0,
              name: today.human.display_name,
              countryName: countryName(today.human.country_code, i18n.language),
              flag: flagEmoji(today.human.country_code),
              quote: today.elements[0]?.answer ?? null,
              drawId: today.human.draw_id,
              isToday: true,
            }}
            photoUri={today.photoUrl}
          />

          <ReportAction
            onReport={(reason) =>
              requireAccount(() => {
                report.mutate(['portrait', today.human.portrait_id, reason], {
                  onSuccess: () => setToast(t('report.submitted')),
                });
              })
            }
          />
        </View>

        <YourStanding />

        {/* You reach the end, and it is finished. */}
        <View style={{ marginTop: theme.spacing.huge, alignItems: 'center' }}>
          <Text color="textTertiary" variant="footnote">
            {t('today.endOfStory')}
          </Text>
        </View>
      </Screen>

      <AskSheet
        onClose={() => setAskOpen(false)}
        onSubmit={async (body) => {
          await ask.mutateAsync(body);
          track('question_submitted');
          setToast(t('questions.submitted'));
        }}
        visible={askOpen}
      />

      <Toast
        message={toast ?? ''}
        onDismiss={() => setToast(null)}
        tone="neutral"
        visible={toast !== null}
      />
    </>
  );
}
