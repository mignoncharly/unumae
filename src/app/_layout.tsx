import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineNotice } from '@/components/shared/OfflineNotice';
import { OnboardingGate } from '@/components/shared/OnboardingGate';
import i18n, { initI18n } from '@/i18n';
import { setAnalyticsProvider, track } from '@/lib/analytics';
import { createSupabaseAnalytics } from '@/lib/analytics/provider';
import { persistOptions } from '@/lib/offline/persist';
import { usePreferences } from '@/stores/preferences';
import { useTheme } from '@/theme';

initI18n();

// First-party analytics: a table in our own database and nowhere else. The
// no-op provider stays the default so tests and unconfigured builds record
// nothing at all.
setAnalyticsProvider(createSupabaseAnalytics());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The cycle changes once a day; there is nothing to poll aggressively.
      staleTime: 60_000,
      retry: 2,
      /*
       * Keep results in memory for a day.
       *
       * This is what makes the persisted cache useful: without it a query is
       * garbage collected five minutes after the last screen using it
       * unmounts, and there would be nothing left to write to disk.
       */
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});

export default function RootLayout() {
  const theme = useTheme();
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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <SafeAreaProvider>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        {/* Above the navigator, so it is visible on every screen. */}
        <OfflineNotice />
        {/* Renders nothing; sends a signed-in person with no profile to finish
            it, which is the only way to be eligible for the draw. */}
        <OnboardingGate />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: theme.colors.background },
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
            headerTitleStyle: { color: theme.colors.text, fontWeight: '600' },
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="(onboarding)"
            options={{ presentation: 'modal', gestureEnabled: false }}
          />
        </Stack>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
