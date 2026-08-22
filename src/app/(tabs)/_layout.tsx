import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

/**
 * Three tabs, and there will not be a fourth without an amendment. Article 1.13:
 * extremely simple design; the person is the star, not the navigation.
 */
export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.today') }} />
      <Tabs.Screen name="archive" options={{ title: t('tabs.archive') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
    </Tabs>
  );
}
