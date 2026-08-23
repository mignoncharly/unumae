import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen contentContainerStyle={{ justifyContent: 'center' }}>
        <EmptyState
          action={{
            label: t('errors.goHome'),
            onPress: () => router.replace('/'),
          }}
          icon="compass"
          title={t('errors.notFound')}
        />
      </Screen>
    </>
  );
}
