import Feather from '@expo/vector-icons/Feather';
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
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: theme.spacing.sm,
          }}
        >
          <Feather color={theme.colors.textTertiary} name="flag" size={14} />
          <Text color="textTertiary" variant="footnote">
            {t('report.action')}
          </Text>
        </View>
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
              style={{
                minHeight: 52,
                justifyContent: 'center',
                borderBottomColor: theme.colors.border,
                borderBottomWidth: 1,
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: theme.spacing.md,
                }}
              >
                <Feather
                  color={theme.colors.textTertiary}
                  name="circle"
                  size={14}
                />
                <Text>{t(`report.reasons.${reason}`)}</Text>
              </View>
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
