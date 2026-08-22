import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  HumanPortrait,
  type PortraitElement,
} from '@/components/human/HumanPortrait';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { ReportAction } from '@/components/shared/ReportAction';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { useTheme } from '@/theme';

/**
 * UX prototype — the Phase 2 deliverable that is looked at rather than shipped.
 *
 * It renders a complete Today's Human with plausible content so the editorial
 * direction can be judged before Phase 7 builds the real screen. Everything
 * here is fabricated; no data is fetched.
 *
 * Developer surfaces are exempt from the no-hardcoded-strings rule: this screen
 * is a design instrument, and translating fake content would be noise.
 */
const ELEMENTS: PortraitElement[] = [
  {
    id: 'from',
    prompt: "Where I'm from",
    answer:
      'Kyoto. Not the postcard part — the part where the buses stop running at ten and everyone knows which vending machine is broken.',
  },
  {
    id: 'feel',
    prompt: 'Today I feel',
    answer: 'Tired in a good way. I finished something I had been avoiding.',
  },
  {
    id: 'love',
    prompt: 'Something I love',
    answer:
      'The five minutes before the shop opens, when the light is on but the door is still locked.',
  },
  {
    id: 'misunderstood',
    prompt: 'Something people misunderstand',
    answer:
      'People think politeness here means distance. It is the opposite. It is how we make room for each other.',
  },
  {
    id: 'ordinary',
    prompt: 'An ordinary moment I treasure',
    answer:
      'My father calls every Sunday and asks about the weather. Neither of us cares about the weather.',
  },
];

const QUESTIONS = [
  {
    id: 'q1',
    question: 'What is something people misunderstand about your country?',
    votes: 342,
    answer:
      'That we are formal. We are careful. It is not the same thing at all.',
  },
  {
    id: 'q2',
    question: 'What does an ordinary Tuesday look like for you?',
    votes: 128,
    answer: null,
  },
  {
    id: 'q3',
    question: 'What is the last thing that made you laugh out loud?',
    votes: 87,
    answer: null,
  },
];

export default function PreviewScreen() {
  const theme = useTheme();
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const [remembered, setRemembered] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Today's Human" }} />
      <Screen>
        <HumanPortrait
          countryCode="JP"
          city="Kyoto"
          elements={ELEMENTS}
          humanNumber={128}
          name="Aya"
          showTimer
        />

        <View style={{ marginTop: theme.spacing.huge, gap: theme.spacing.md }}>
          <Text color="textTertiary" variant="footnote">
            QUESTIONS
          </Text>

          {QUESTIONS.map((item) => (
            <QuestionCard
              answer={item.answer}
              canVote
              hasVoted={voted[item.id] ?? false}
              key={item.id}
              onVote={() => {
                setVoted((previous) => ({
                  ...previous,
                  [item.id]: !previous[item.id],
                }));
              }}
              question={item.question}
              votes={item.votes + (voted[item.id] ? 1 : 0)}
            />
          ))}
        </View>

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.lg }}>
          {/*
            Remember shows no count — not even here. The private library is the
            entire mechanic (Article 9.4).
          */}
          <Button
            label={remembered ? 'Remembered' : 'Remember this Human'}
            onPress={() => {
              setRemembered((previous) => !previous);
              setToast(remembered ? 'Removed' : 'Added to your library');
            }}
            variant={remembered ? 'secondary' : 'primary'}
          />

          <ReportAction
            onBlock={() => setToast('Blocked')}
            onReport={() => setToast('Thank you. Our team will review this.')}
          />
        </View>

        {/* Article 1.7 — you reach the end, and it is finished. */}
        <View style={{ marginTop: theme.spacing.huge, alignItems: 'center' }}>
          <Text color="textTertiary" variant="footnote">
            You have reached the end.
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
