import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useIsAuthenticated } from '@/features/auth/useSession';
import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';

export interface NotificationSettings {
  daily: boolean;
  selected: boolean;
  answered: boolean;
  anniversary: boolean;
}

/**
 * Defaults if the row does not exist yet. Conservative on purpose: the two
 * categories about *you* are on, the two about the product are off until
 * somebody asks for them.
 */
export const DEFAULT_SETTINGS: NotificationSettings = {
  daily: false,
  selected: true,
  answered: true,
  anniversary: false,
};

export const notificationKeys = {
  settings: ['notification-settings'] as const,
};

async function fetchSettings(): Promise<NotificationSettings> {
  const { data, error } = await getSupabase().rpc('get_notification_settings');

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return data?.[0] ?? DEFAULT_SETTINGS;
}

export function useNotificationSettings() {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: notificationKeys.settings,
    queryFn: fetchSettings,
    enabled: isAuthenticated,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: NotificationSettings) => {
      const { error } = await getSupabase().rpc('set_notification_settings', {
        daily: settings.daily,
        selected: settings.selected,
        answered: settings.answered,
        anniversary: settings.anniversary,
      });

      if (error) {
        throw new AppError('unknown', 'notifications.saveFailed', {
          cause: error,
        });
      }
      return settings;
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(notificationKeys.settings, settings);
    },
  });
}
