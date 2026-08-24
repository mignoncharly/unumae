import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { HumanPortrait } from '@/components/human/HumanPortrait';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { ReportAction } from '@/components/shared/ReportAction';
import { ShareButton } from '@/components/sharing/ShareButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { signArchivePhoto } from '@/features/archive/api';
import { useHuman } from '@/features/archive/hooks';
import { useIsAuthenticated } from '@/features/auth/useSession';
import { getPortraitElements } from '@/features/daily-human/api';
import { useQuestions } from '@/features/daily-human/hooks';
import { useReport } from '@/features/moderation/hooks';
import type { PortraitElementKey } from '@/features/portraits/prompts';
import { useBlockContentAuthor } from '@/features/privacy/hooks';
import { toAppError } from '@/lib/errors';
import { useTheme } from '@/theme';
import { countryName, flagEmoji } from '@/utils/country';
import { formatHumanNumber } from '@/utils/cycle';

/**
 * One archived Human.
 *
 * The same portrait, rendered the same way, without the countdown — because
 * their day is over, not because they became less important. Questions and
 * answers stay readable forever (Article 1.9).
 */
export default function HumanScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isAuthenticated = useIsAuthenticated();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: human, isLoading, isError, error, refetch } = useHuman(id);
  const { data: questions } = useQuestions(human?.is_removed ? undefined : id);
  const report = useReport();
  const block = useBlockContentAuthor();

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [elements, setElements] = useState<
    { key: PortraitElementKey; answer: string }[]
  >([]);
  const [toast, setToast] = useState<string | null>(null);

  function requireAccount(action: () => void) {
    if (!isAuthenticated) {
      router.push('/(auth)/sign-in');
      return;
    }
    action();
  }

  useEffect(() => {
    let active = true;
    if (!human || human.is_removed) {
      return;
    }

    void signArchivePhoto(human.photo_path).then((url) => {
      if (active) setPhotoUrl(url);
    });
    void getPortraitElements(human.draw_id).then((result) => {
      if (active) setElements(result);
    });

    return () => {
      active = false;
    };
  }, [human]);

  if (isLoading) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing.lg }}>
          <Skeleton height={20} width="40%" />
          <Skeleton height={44} width="70%" />
          <Skeleton height={280} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <Screen contentContainerStyle={{ justifyContent: 'center' }}>
          <ErrorState
            error={toAppError(error)}
            onRetry={() => void refetch()}
          />
        </Screen>
      </>
    );
  }

  if (!human) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <Screen>
          <EmptyState icon="book-open" title={t('archive.notFound')} />
        </Screen>
      </>
    );
  }

  // The tombstone (Article 8.6): the number and the date remain so the Archive
  // is a complete sequence, and the person is gone. No explanation is given,
  // because the reason is nobody else's business.
  if (human.is_removed) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <Screen>
          <Text color="textTertiary" variant="mono">
            {formatHumanNumber(human.human_number)}
          </Text>
          <Text
            color="textSecondary"
            style={{ marginTop: theme.spacing.xl }}
            variant="callout"
          >
            {t('archive.removedBody', { date: human.selection_date })}
          </Text>
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <Screen>
        <HumanPortrait
          city={human.city}
          countryCode={human.country_code ?? ''}
          elements={elements.map((element) => ({
            id: element.key,
            prompt: t(`portrait.prompts.${element.key}.label`),
            answer: element.answer,
          }))}
          founding={human.founding}
          humanNumber={human.human_number}
          name={human.display_name ?? ''}
          photoUri={photoUrl}
        />

        {questions && questions.length > 0 ? (
          <View
            style={{ marginTop: theme.spacing.huge, gap: theme.spacing.md }}
          >
            <Text color="textTertiary" variant="footnote">
              {t('questions.title').toUpperCase()}
            </Text>
            {questions.map((question) => (
              <QuestionCard
                answer={question.answer}
                // Their day is over: the queue is closed, and voting on it now
                // would mean nothing.
                canVote={false}
                hasVoted={question.has_voted ?? false}
                key={question.id}
                onVote={() => {}}
                onReport={(reason) =>
                  requireAccount(() => {
                    report.mutate(['question', question.id, reason], {
                      onError: () => setToast(t('report.failed')),
                      onSuccess: () => setToast(t('report.submitted')),
                    });
                  })
                }
                onBlock={() =>
                  requireAccount(() => {
                    block.mutate(['question', question.id], {
                      onError: () => setToast(t('report.blockFailed')),
                      onSuccess: () => setToast(t('report.blocked')),
                    });
                  })
                }
                question={question.body}
                votes={question.votes}
              />
            ))}
          </View>
        ) : null}

        {/* An archived Human is as worth passing on as today's. Article 1.9 —
            the Archive is the product, not a backlog. */}
        <View style={{ marginTop: theme.spacing.xxl }}>
          <ShareButton
            human={{
              humanNumber: human.human_number,
              name: human.display_name ?? '',
              countryName: countryName(human.country_code ?? '', i18n.language),
              flag: flagEmoji(human.country_code ?? ''),
              quote: elements[0]?.answer ?? null,
              drawId: human.draw_id,
              isToday: false,
            }}
            photoUri={photoUrl}
          />
        </View>

        {human.portrait_id ? (
          <View style={{ marginTop: theme.spacing.lg }}>
            <ReportAction
              onReport={(reason) =>
                requireAccount(() => {
                  report.mutate(['portrait', human.portrait_id!, reason], {
                    onError: () => setToast(t('report.failed')),
                    onSuccess: () => setToast(t('report.submitted')),
                  });
                })
              }
              onBlock={() =>
                requireAccount(() => {
                  block.mutate(['portrait', human.portrait_id!], {
                    onError: () => setToast(t('report.blockFailed')),
                    onSuccess: () => {
                      setToast(t('report.blocked'));
                      router.replace('/archive');
                    },
                  });
                })
              }
            />
          </View>
        ) : null}

        <View style={{ marginTop: theme.spacing.huge, alignItems: 'center' }}>
          <Text color="textTertiary" variant="footnote">
            {t('archive.dayIsOver', { date: human.selection_date })}
          </Text>
        </View>
      </Screen>
      <Toast
        message={toast ?? ''}
        onDismiss={() => setToast(null)}
        tone="neutral"
        visible={toast !== null}
      />
    </>
  );
}
