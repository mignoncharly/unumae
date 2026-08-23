import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useIsAuthenticated } from '@/features/auth/useSession';
import { useMyProfile } from '@/features/profiles/hooks';
import { daysUntilEligible } from '@/features/selection/eligibility';
import { useEligibility } from '@/features/selection/hooks';
import { useSelectionStats } from '@/features/stats/hooks';
import { useTheme } from '@/theme';

/**
 * Where you stand, on the one screen everybody opens.
 *
 * The app knew all of this already and said none of it. Every honest answer
 * lived on Settings → The daily draw, three taps from anywhere, so somebody who
 * never went looking learned nothing about their own standing — including that
 * they were in the draw at all, which is the entire point of the product.
 *
 * One line, in the quietest type on the screen, below the person rather than
 * above them. Article 11: the person is the star, and a status panel competing
 * with somebody's face would be the interface forgetting that.
 *
 * It is not a prompt. A guest is told the same fact the transparency page
 * publishes and is asked for nothing — signing in is offered at the moment
 * somebody tries to act, never on arrival (Article 6.1).
 */
export function YourStanding({
  /**
   * A Quiet Day centres everything on the screen, and a left-aligned line with
   * a rule above it below a centred block reads as a piece of a different
   * layout. Under a portrait the page is left-aligned and so is this.
   */
  centered = false,
}: {
  centered?: boolean;
} = {}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isAuthenticated = useIsAuthenticated();
  const { data: profile } = useMyProfile();
  const { data: stats } = useSelectionStats();
  const { eligibility, loading } = useEligibility();

  if (loading) {
    return null;
  }

  /*
   * Only two of these lines need the pool size, and an empty pool is exactly
   * the moment the rest are most worth saying. Gating the whole component on a
   * non-zero count would have hidden "you join the draw in seven days" through
   * the entire period when everybody is seven days old.
   */
  const waiting = stats
    ? new Intl.NumberFormat(i18n.language).format(stats.waiting)
    : null;

  const line = (): string | null => {
    // A guest gets the fact, and nothing asked of them.
    if (!isAuthenticated || !profile) {
      return stats && stats.waiting > 0
        ? t('standing.guest', { count: stats.waiting, waiting })
        : null;
    }

    if (eligibility.eligible) {
      return stats && stats.waiting > 0
        ? t('standing.inPool', { count: stats.waiting, waiting })
        : null;
    }

    const [reason] = eligibility.reasons;

    switch (reason) {
      case 'already-been-human':
        return t('standing.alreadyHad');
      case 'opted-out':
        return t('standing.optedOut');
      case 'account-too-new':
        return t('standing.tooNew', {
          count: daysUntilEligible(profile),
          days: daysUntilEligible(profile),
        });
      case 'awaiting-refresh':
        return t('standing.awaiting');
      default:
        // Something actionable — the eligibility screen explains it properly
        // rather than this line trying to summarise every case badly.
        return t('standing.notYet');
    }
  };

  const text = line();

  if (text === null) {
    return null;
  }

  return (
    <View
      style={{
        marginTop: theme.spacing.xxl,
        gap: theme.spacing.xs,
        ...(centered
          ? {
              /*
               * A Quiet Day has nothing else on it, so this is the one place
               * the line becomes a panel rather than a footnote — it gives the
               * screen something to be about. Under a portrait it stays a
               * hairline and a sentence, because there the person is the
               * subject and this is a margin note.
               */
              alignItems: 'center' as const,
              padding: theme.spacing.xl,
              backgroundColor: theme.colors.accentSurface,
              borderRadius: theme.radius.lg,
            }
          : {
              paddingTop: theme.spacing.lg,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.colors.border,
            }),
      }}
    >
      <Text
        color={centered ? 'text' : 'textSecondary'}
        style={centered ? { textAlign: 'center' } : undefined}
        variant={centered ? 'callout' : 'footnote'}
      >
        {text}
      </Text>

      {isAuthenticated ? (
        <Link href="/settings/eligibility">
          <Text color="textTertiary" variant="caption">
            {t('standing.more')} →
          </Text>
        </Link>
      ) : null}
    </View>
  );
}
