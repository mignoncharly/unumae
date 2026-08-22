import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

export default function NotFoundScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen>
        <Text variant="title2">{t('errors.notFound')}</Text>
        <View style={{ marginTop: theme.spacing.lg }}>
          <Link href="/">
            <Text color="accent">{t('errors.goHome')} →</Text>
          </Link>
        </View>
      </Screen>
    </>
  );
}
