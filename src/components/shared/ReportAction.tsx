import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

export type ReportReason =
  | 'harassment'
  | 'hate'
  | 'sexual'
  | 'violence'
  | 'impersonation'
  | 'spam'
  | 'other';

const REASONS: ReportReason[] = [
  'harassment',
  'hate',
  'sexual',
  'violence',
  'impersonation',
  'spam',
  'other',
];

interface ReportActionProps {
  onReport: (reason: ReportReason) => void;
  onBlock?: () => void;
}

/**
 * Layer 4 of moderation: community reports (Article 8.1).
 *
 * Reporting is deliberately understated — always reachable, never prominent.
 * A loud report button invites use as a weapon; a hidden one protects nobody.
 */
export function ReportAction({ onReport, onBlock }: ReportActionProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityLabel={t('report.action')}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <Text color="textTertiary" variant="footnote">
          {t('report.action')}
        </Text>
      </Pressable>

      <Sheet
        onClose={() => setOpen(false)}
        title={t('report.title')}
        visible={open}
      >
        <View style={{ gap: theme.spacing.sm }}>
          {REASONS.map((reason) => (
            <Pressable
              accessibilityRole="button"
              key={reason}
              onPress={() => {
                setOpen(false);
                onReport(reason);
              }}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text>{t(`report.reasons.${reason}`)}</Text>
            </Pressable>
          ))}

          {onBlock ? (
            <Button
              label={t('report.block')}
              onPress={() => {
                setOpen(false);
                onBlock();
              }}
              variant="secondary"
              style={{ marginTop: theme.spacing.md }}
            />
          ) : null}
        </View>
      </Sheet>
    </>
  );
}
