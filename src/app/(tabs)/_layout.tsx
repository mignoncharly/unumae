import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

/**
 * Three tabs, and there will not be a fourth without an amendment. Article 1.13:
 * extremely simple design; the person is the star, not the navigation.
 *
 * The icons are Feather — thin, unfilled, and the closest thing an icon set
 * gets to the typographic restraint of the rest of the product. Article 11 says
 * the interface is furniture, and furniture does not shout.
 *
 * They are also not optional. React Navigation renders a placeholder when a tab
 * has no `tabBarIcon`, and on Android that placeholder is the missing-glyph
 * box: three tofu squares sat above the labels.
 */
export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // The brand, on the one control visible from every screen.
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          // A person, because that is what the tab contains.
          tabBarIcon: ({ color, size }) => (
            <Feather color={color} name="user" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: t('tabs.archive'),
          // Not a folder or a database — a book, which is what the Archive is.
          tabBarIcon: ({ color, size }) => (
            <Feather color={color} name="book-open" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <Feather color={color} name="settings" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
