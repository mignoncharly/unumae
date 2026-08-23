import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { loadNotificationsModule } from '@/features/notifications/push';
import { track } from '@/lib/analytics';
import {
  ACCEPT_SELECTION_ACTION,
  DECLINE_SELECTION_ACTION,
  notificationRoute,
  SELECTION_NOTIFICATION_CATEGORY,
} from '@/lib/notifications';
import { getSupabase } from '@/lib/supabase';

const handledResponses = new Set<string>();

/**
 * Opens every notification into the product state it describes, including
 * cold starts, and owns the two explicit invitation actions registered with
 * iOS. The draw state machine remains in database RPCs; a notification never
 * gets a privileged shortcut around consent or the acceptance deadline.
 */
export function NotificationCoordinator() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  useEffect(() => {
    const notifications = loadNotificationsModule();
    if (!notifications) {
      return;
    }

    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    void notifications
      .setNotificationCategoryAsync(SELECTION_NOTIFICATION_CATEGORY, [
        {
          identifier: ACCEPT_SELECTION_ACTION,
          buttonTitle: t('notifications.actions.accept'),
          options: {
            isAuthenticationRequired: true,
            opensAppToForeground: true,
          },
        },
        {
          identifier: DECLINE_SELECTION_ACTION,
          buttonTitle: t('notifications.actions.decline'),
          options: {
            isAuthenticationRequired: true,
            opensAppToForeground: true,
          },
        },
      ])
      .catch(() => undefined);

    const refreshSelection = () => {
      void queryClient.invalidateQueries({ queryKey: ['invitation'] });
      void queryClient.invalidateQueries({ queryKey: ['human-journey'] });
    };

    const handle = async (
      response: Awaited<
        ReturnType<typeof notifications.getLastNotificationResponseAsync>
      >
    ) => {
      if (!response) {
        return;
      }

      const responseKey = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handledResponses.has(responseKey)) {
        return;
      }
      handledResponses.add(responseKey);

      const data = response.notification.request.content.data;
      track('notification_opened', { action: response.actionIdentifier });

      if (response.actionIdentifier === ACCEPT_SELECTION_ACTION) {
        const supabase = getSupabase();
        await supabase.auth.getSession();
        const { data: accepted, error } =
          await supabase.rpc('accept_selection');
        refreshSelection();
        if (!error && accepted) {
          track('selection_accepted', { source: 'notification' });
          router.replace('/(selection)/portrait');
          return;
        }
        router.replace('/(selection)/invitation');
        return;
      }

      if (response.actionIdentifier === DECLINE_SELECTION_ACTION) {
        const supabase = getSupabase();
        await supabase.auth.getSession();
        const { error } = await supabase.rpc('decline_selection');
        refreshSelection();
        if (!error) {
          track('selection_declined', { source: 'notification' });
          router.replace('/(tabs)');
          return;
        }
        router.replace('/(selection)/invitation');
        return;
      }

      router.push(notificationRoute(data));
    };

    const subscription = notifications.addNotificationResponseReceivedListener(
      (response) => void handle(response)
    );

    void notifications
      .getLastNotificationResponseAsync()
      .then(async (response) => {
        if (!response) {
          return;
        }
        await handle(response);
        await notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => undefined);

    return () => {
      subscription.remove();
      notifications.setNotificationHandler(null);
    };
  }, [queryClient, t]);

  return null;
}
