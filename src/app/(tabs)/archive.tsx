import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { track } from '@/lib/analytics';
import { useTheme } from '@/theme';

/**
 * The Archive — Phase 8 builds it. Note what will never appear here: most
 * liked, top human, viral, trending (Article 9.5).
 */
export default function ArchiveScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    track('archive_opened');
  }, []);

  return (
    <Screen>
      <Text variant="title1">{t('archive.title')}</Text>
      <Text
        variant="callout"
        color="textSecondary"
        style={{ marginTop: theme.spacing.sm }}
      >
        {t('archive.subtitle')}
      </Text>

      <View style={{ marginTop: theme.spacing.xxxl }}>
        <Text color="textSecondary">{t('archive.empty')}</Text>
      </View>
    </Screen>
  );
}
