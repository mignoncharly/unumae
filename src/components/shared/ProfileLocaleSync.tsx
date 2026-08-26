import { useEffect, useMemo, useRef } from 'react';

import { useMyProfile, useUpdateProfile } from '@/features/profiles/hooks';
import { resolveDeviceLocale } from '@/i18n';
import { usePreferences } from '@/stores/preferences';

/**
 * Notification/email language lives on the profile; interface language lives
 * on this device. This keeps the concrete locale in sync while preserving the
 * local "follow system" choice.
 */
export function ProfileLocaleSync() {
  const preference = usePreferences((state) => state.locale);
  const desired = useMemo(
    () => preference ?? resolveDeviceLocale(),
    [preference]
  );
  const { data: profile } = useMyProfile();
  const update = useUpdateProfile();
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!profile || profile.locale === desired || update.isPending) {
      return;
    }

    const key = `${profile.id}:${profile.locale}:${desired}`;
    if (attempted.current === key) {
      return;
    }
    attempted.current = key;
    update.mutate(
      { locale: desired },
      {
        onSuccess: () => {
          attempted.current = null;
        },
        onError: () => {
          attempted.current = null;
        },
      }
    );
  }, [desired, profile, update]);

  return null;
}
