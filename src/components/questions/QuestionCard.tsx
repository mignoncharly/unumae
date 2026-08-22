import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

export interface QuestionCardProps {
  question: string;
  /** Upvotes. There is no downvote, and there never will be (Article 9.3). */
  votes: number;
  hasVoted: boolean;
  /** Guests may read questions but not vote (Article 6.1). */
  canVote: boolean;
  onVote: () => void;
  /** Today's Human answers what they choose to answer (Article 6.3). */
  answer?: string | null;
}

export function QuestionCard({
  question,
  votes,
  hasVoted,
  canVote,
  onVote,
  answer,
}: QuestionCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={{
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.lg,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
      }}
    >
      <Text variant="callout">{question}</Text>

      {answer ? (
        <View
          style={{
            gap: theme.spacing.xs,
            paddingLeft: theme.spacing.lg,
            borderLeftWidth: 2,
            borderLeftColor: theme.colors.border,
          }}
        >
          <Text>{answer}</Text>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
        }}
      >
        <Pressable
          accessibilityLabel={t('questions.askThis')}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canVote, selected: hasVoted }}
          disabled={!canVote}
          onPress={onVote}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            minHeight: 44,
            paddingRight: theme.spacing.sm,
            opacity: !canVote ? 0.4 : pressed ? 0.6 : 1,
          })}
        >
          <Text color={hasVoted ? 'accent' : 'textTertiary'}>
            {hasVoted ? '▲' : '△'}
          </Text>
          <Text color={hasVoted ? 'text' : 'textSecondary'} variant="footnote">
            {t('questions.askThis')}
          </Text>
        </Pressable>

        {/*
          The vote count is public: it is a queue position, not a judgement of
          a person. The Remember count is the one that stays private.
        */}
        <Text color="textTertiary" variant="footnote">
          {votes}
        </Text>
      </View>
    </View>
  );
}
