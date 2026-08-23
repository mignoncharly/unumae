import { router } from 'expo-router';
import { useEffect } from 'react';

import { loadNotificationsModule } from '@/features/notifications/push';
import { track } from '@/lib/analytics';
import { notificationRoute } from '@/lib/notifications';

/** Opens every push into the product state it describes, including cold starts. */
export function NotificationCoordinator() {
  useEffect(() => {
    const notifications = loadNotificationsModule();
    if (!notifications) {
      return;
    }

    const open = (data: unknown) => {
      track('notification_opened');
      router.push(notificationRoute(data));
    };

    const subscription = notifications.addNotificationResponseReceivedListener(
      (response) => open(response.notification.request.content.data)
    );

    void notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) {
        return;
      }
      open(response.notification.request.content.data);
      void notifications.clearLastNotificationResponseAsync();
    });

    return () => subscription.remove();
  }, []);

  return null;
}
