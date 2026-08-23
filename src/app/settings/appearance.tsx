import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/ui/Icon';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { usePreferences } from '@/stores/preferences';

const OPTIONS = [
  { value: 'system', icon: 'smartphone' },
  { value: 'light', icon: 'sun' },
  { value: 'dark', icon: 'moon' },
] as const;

export default function AppearanceScreen() {
  const { t } = useTranslation();
  const appearance = usePreferences((state) => state.appearance);
  const setAppearance = usePreferences((state) => state.setAppearance);

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('appearance.title') }}
      />
      <Screen>
        <PageHeader
          subtitle={t('appearance.subtitle')}
          title={t('appearance.title')}
        />
        <ListGroup>
          {OPTIONS.map((option, index) => (
            <ListRow
              first={index === 0}
              icon={option.icon}
              key={option.value}
              onPress={() => setAppearance(option.value)}
              title={t(`appearance.options.${option.value}`)}
              trailing={
                appearance === option.value ? (
                  <Icon color="accent" name="check-circle" />
                ) : undefined
              }
            />
          ))}
        </ListGroup>
      </Screen>
    </>
  );
}
