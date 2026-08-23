import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { HumanPortrait } from '@/components/human/HumanPortrait';
import { RememberAction } from '@/components/human/RememberAction';
import { YourStanding } from '@/components/human/YourStanding';
import { AskSheet } from '@/components/questions/AskSheet';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { JourneyCard } from '@/components/selection/JourneyCard';
import { ReportAction } from '@/components/shared/ReportAction';
import { ShareButton } from '@/components/sharing/ShareButton';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Surface } from '@/components/ui/Surface';
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
import { toAppError } from '@/lib/errors';
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

  const { data: today, isLoading, isError, error, refetch } = useTodaysHuman();
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
        <Surface tone="accent" style={{ gap: theme.spacing.lg }}>
          <Skeleton height={16} width="34%" />
          <Skeleton height={420} radius={theme.radius.xl} />
          <Skeleton height={52} width="62%" />
          <Skeleton height={36} width="48%" radius={theme.radius.full} />
        </Surface>
        <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing.xl }}>
          <Skeleton height={150} radius={theme.radius.xl} />
          <Skeleton height={150} radius={theme.radius.xl} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen contentContainerStyle={{ justifyContent: 'center' }}>
        <ErrorState error={toAppError(error)} onRetry={() => void refetch()} />
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
        <View style={{ marginBottom: theme.spacing.lg }}>
          <Text
            color="accent"
            variant="caption"
            style={{ fontWeight: '700', letterSpacing: 1.4 }}
          >
            {t('common.tagline').toUpperCase()}
          </Text>
        </View>
        <JourneyCard />
        <View style={{ height: theme.spacing.xl }} />
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
          cycleDate={today.human.selection_date}
          showTimer
        />

        <View style={{ marginTop: theme.spacing.huge, gap: theme.spacing.lg }}>
          <SectionHeader
            caption={t('questions.sectionIntro')}
            title={t('questions.title')}
            action={
              <Button
                icon="edit-3"
                label={t('questions.ask')}
                onPress={() => requireAccount(() => setAskOpen(true))}
                variant="ghost"
              />
            }
          />

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
            <EmptyState
              action={{
                label: t('questions.ask'),
                onPress: () => requireAccount(() => setAskOpen(true)),
              }}
              icon="message-circle"
              title={t('questions.empty')}
            />
          )}
        </View>

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.lg }}>
          {/*
            No count, here or anywhere. Remember is a private library, and the
            number of people who kept someone is not a score (Article 9.4).
          */}
          <RememberAction
            label={remembered ? t('remember.remembered') : t('remember.action')}
            supportingText={t('remember.meaning')}
            remembered={Boolean(remembered)}
            onPress={() =>
              requireAccount(() => {
                remember.mutate(!remembered);
                track('human_remembered');
                setToast(
                  remembered ? t('remember.removed') : t('remember.added')
                );
              })
            }
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
        <View
          style={{
            marginTop: theme.spacing.huge,
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <View
            style={{
              height: 1,
              width: 48,
              backgroundColor: theme.colors.borderStrong,
            }}
          />
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
