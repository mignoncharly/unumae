import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { loadNotificationsModule } from '@/features/notifications/push';
import { track } from '@/lib/analytics';
import {
  ACCEPT_SELECTION_ACTION,
  DECLINE_SELECTION_ACTION,
  notificationAction,
  notificationCategory,
  notificationDestination,
  notificationInvitationId,
  notificationRoute,
  SELECTION_NOTIFICATION_CATEGORY,
} from '@/lib/notifications';
import { getSupabase } from '@/lib/supabase';

const handledResponses = new Set<string>();
const RESPONSE_ATTEMPTS = 3;

async function retryResponseOperation<T>(
  operation: () => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RESPONSE_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < RESPONSE_ATTEMPTS) {
        await new Promise((resolve) =>
          setTimeout(resolve, 250 * 2 ** (attempt - 1))
        );
      }
    }
  }
  throw lastError;
}

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
      >,
      source: 'cold_start' | 'warm_start'
    ): Promise<boolean> => {
      if (!response) {
        return false;
      }

      const responseKey = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handledResponses.has(responseKey)) {
        return true;
      }

      const data = response.notification.request.content.data;
      const category = notificationCategory(data);

      const invitationId = notificationInvitationId(data);
      if (category === 'selected' && invitationId) {
        const supabase = getSupabase();
        await retryResponseOperation(async () => {
          await supabase.auth.getSession();
          const { error } = await supabase.rpc('mark_invitation_opened', {
            target_invitation: invitationId,
            open_source: 'notification',
          });
          if (error) throw error;
        });
      }

      track('notification_opened', {
        action: notificationAction(response.actionIdentifier),
        category,
        destination: notificationDestination(data),
        source,
      });

      if (response.actionIdentifier === ACCEPT_SELECTION_ACTION) {
        const supabase = getSupabase();
        await supabase.auth.getSession();
        const { data: accepted, error } =
          await supabase.rpc('accept_selection');
        refreshSelection();
        if (!error && accepted) {
          track('selection_accepted', { source: 'notification' });
          router.replace('/(selection)/portrait');
          handledResponses.add(responseKey);
          return true;
        }
        router.replace('/(selection)/invitation');
        handledResponses.add(responseKey);
        return true;
      }

      if (response.actionIdentifier === DECLINE_SELECTION_ACTION) {
        const supabase = getSupabase();
        await supabase.auth.getSession();
        const { error } = await supabase.rpc('decline_selection');
        refreshSelection();
        if (!error) {
          track('selection_declined', { source: 'notification' });
          router.replace('/(tabs)');
          handledResponses.add(responseKey);
          return true;
        }
        router.replace('/(selection)/invitation');
        handledResponses.add(responseKey);
        return true;
      }

      router.push(notificationRoute(data));
      handledResponses.add(responseKey);
      return true;
    };

    const subscription = notifications.addNotificationResponseReceivedListener(
      (response) => void handle(response, 'warm_start').catch(() => undefined)
    );

    void notifications
      .getLastNotificationResponseAsync()
      .then(async (response) => {
        if (!response) {
          return;
        }
        if (await handle(response, 'cold_start')) {
          await notifications.clearLastNotificationResponseAsync();
        }
      })
      .catch(() => undefined);

    return () => {
      subscription.remove();
      notifications.setNotificationHandler(null);
    };
  }, [queryClient, t]);

  return null;
}
