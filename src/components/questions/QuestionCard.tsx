import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import {
  ReportAction,
  type ReportReason,
} from '@/components/shared/ReportAction';
import { Surface } from '@/components/ui/Surface';
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
  translated?: boolean;
  onReport?: (reason: ReportReason) => void;
  onBlock?: () => void;
}

export function QuestionCard({
  question,
  votes,
  hasVoted,
  canVote,
  onVote,
  answer,
  translated = false,
  onReport,
  onBlock,
}: QuestionCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Surface style={{ gap: theme.spacing.md }}>
      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: 'row',
          gap: theme.spacing.md,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.accentSurface,
            borderRadius: theme.radius.full,
            height: 34,
            justifyContent: 'center',
            width: 34,
          }}
        >
          <Feather
            color={theme.colors.accent}
            name="message-circle"
            size={16}
          />
        </View>
        <Text variant="callout" style={{ flex: 1, fontWeight: '500' }}>
          {question}
        </Text>
      </View>

      {answer ? (
        <View
          style={{
            backgroundColor: theme.colors.surfaceWarm,
            borderRadius: theme.radius.lg,
            gap: theme.spacing.xs,
            padding: theme.spacing.lg,
          }}
        >
          <Text
            color="accent"
            variant="caption"
            style={{ fontWeight: '700', letterSpacing: 0.8 }}
          >
            {t('questions.answered').toUpperCase()}
          </Text>
          <Text>{answer}</Text>
        </View>
      ) : null}

      {translated ? (
        <Text color="textTertiary" variant="caption">
          {t('translation.translated')}
        </Text>
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
            alignItems: 'center',
            backgroundColor: hasVoted
              ? theme.colors.accentSurface
              : theme.colors.surfaceMuted,
            borderRadius: theme.radius.full,
            flexDirection: 'row',
            gap: theme.spacing.sm,
            minHeight: 44,
            paddingHorizontal: theme.spacing.md,
            opacity: !canVote ? 0.4 : pressed ? 0.62 : 1,
          })}
        >
          <Feather
            color={hasVoted ? theme.colors.accent : theme.colors.textTertiary}
            name="arrow-up"
            size={16}
          />
          <Text
            color={hasVoted ? 'accent' : 'textSecondary'}
            variant="footnote"
          >
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

      {onReport ? (
        <ReportAction onReport={onReport} {...(onBlock ? { onBlock } : {})} />
      ) : null}
    </Surface>
  );
}
