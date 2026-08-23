import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { HumanPortrait } from '@/components/human/HumanPortrait';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { signArchivePhoto } from '@/features/archive/api';
import { useHuman } from '@/features/archive/hooks';
import { getPortraitElements } from '@/features/daily-human/api';
import { useQuestions } from '@/features/daily-human/hooks';
import type { PortraitElementKey } from '@/features/portraits/prompts';
import { useTheme } from '@/theme';

/**
 * One archived Human.
 *
 * The same portrait, rendered the same way, without the countdown — because
 * their day is over, not because they became less important. Questions and
 * answers stay readable forever (Article 1.9).
 */
export default function HumanScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: human, isLoading } = useHuman(id);
  const { data: questions } = useQuestions(human?.is_removed ? undefined : id);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [elements, setElements] = useState<
    { key: PortraitElementKey; answer: string }[]
  >([]);

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

  if (!human) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <Screen>
          <EmptyState title={t('archive.notFound')} />
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
            {`HUMAN #${String(human.human_number).padStart(4, '0')}`}
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
                question={question.body}
                votes={question.votes}
              />
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: theme.spacing.huge, alignItems: 'center' }}>
          <Text color="textTertiary" variant="footnote">
            {t('archive.dayIsOver', { date: human.selection_date })}
          </Text>
        </View>
      </Screen>
    </>
  );
}
