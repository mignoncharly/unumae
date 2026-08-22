import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n, { initI18n } from '@/i18n';
import { track } from '@/lib/analytics';
import { usePreferences } from '@/stores/preferences';

initI18n();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The cycle changes once a day; there is nothing to poll aggressively.
      staleTime: 60_000,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const locale = usePreferences((state) => state.locale);

  useEffect(() => {
    track('app_opened');
  }, []);

  useEffect(() => {
    // null means "follow the system language", which initI18n already resolved.
    if (locale && i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
  }, [locale]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
