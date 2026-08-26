import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';
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
  settings: (userId: string) => ['notification-settings', userId] as const,
};

async function fetchSettings(): Promise<NotificationSettings> {
  const { data, error } = await getSupabase().rpc('get_notification_settings');

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return data?.[0] ?? DEFAULT_SETTINGS;
}

export function useNotificationSettings() {
  const session = useSession();
  const userId = session.session?.user.id ?? 'anonymous';

  return useQuery({
    queryKey: notificationKeys.settings(userId),
    queryFn: fetchSettings,
    enabled: session.status === 'authenticated',
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  const session = useSession();
  const userId = session.session?.user.id ?? 'anonymous';

  return useMutation({
    scope: { id: `notification-settings:${userId}` },
    mutationFn: async ({
      key,
      value,
    }: {
      key: keyof NotificationSettings;
      value: boolean;
    }) => {
      const { error } = await getSupabase().rpc('patch_notification_setting', {
        setting_name: key,
        setting_value: value,
      });

      if (error) {
        throw new AppError('unknown', 'notifications.saveFailed', {
          cause: error,
        });
      }
      return { key, value };
    },
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({
        queryKey: notificationKeys.settings(userId),
      });
      const previous = queryClient.getQueryData<NotificationSettings>(
        notificationKeys.settings(userId)
      );
      queryClient.setQueryData<NotificationSettings>(
        notificationKeys.settings(userId),
        { ...(previous ?? DEFAULT_SETTINGS), [key]: value }
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          notificationKeys.settings(userId),
          context.previous
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.settings(userId),
      });
    },
  });
}
