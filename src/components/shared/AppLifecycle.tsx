import { focusManager, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { recordActiveDay } from '@/lib/analytics/activeDay';

/** Keeps daily data aligned with the global UTC cycle and foreground state. */
export function AppLifecycle() {
  const queryClient = useQueryClient();

  const refreshCycle = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['todays-human'] });
    void queryClient.invalidateQueries({ queryKey: ['questions'] });
    void queryClient.invalidateQueries({ queryKey: ['human-journey'] });
    void queryClient.invalidateQueries({ queryKey: ['archive'] });
    void queryClient.invalidateQueries({ queryKey: ['archive-human'] });
    void queryClient.invalidateQueries({ queryKey: ['archive-countries'] });
    void queryClient.invalidateQueries({ queryKey: ['archive-years'] });
    void queryClient.invalidateQueries({ queryKey: ['anniversaries'] });
  }, [queryClient]);

  useEffect(() => {
    if (AppState.currentState === 'active') {
      void recordActiveDay();
    }

    const subscription = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      focusManager.setFocused(active);
      if (active) {
        void recordActiveDay();
        refreshCycle();
      }
    });

    return () => subscription.remove();
  }, [refreshCycle]);

  useEffect(() => {
    let boundaryTimer: ReturnType<typeof setTimeout>;
    let publicationTimer: ReturnType<typeof setTimeout>;

    const scheduleBoundary = () => {
      const now = new Date();
      const next = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1
      );

      boundaryTimer = setTimeout(
        () => {
          void recordActiveDay();
          refreshCycle();
          // Publication runs just after midnight; check once more when it has
          // had time to complete instead of polling through the night.
          publicationTimer = setTimeout(refreshCycle, 75_000);
          scheduleBoundary();
        },
        Math.max(1, next - now.getTime() + 50)
      );
    };

    scheduleBoundary();
    return () => {
      clearTimeout(boundaryTimer);
      clearTimeout(publicationTimer);
    };
  }, [refreshCycle]);

  return null;
}
