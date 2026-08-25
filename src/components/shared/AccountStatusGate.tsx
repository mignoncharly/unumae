import { useQueryClient } from '@tanstack/react-query';
import { router, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import {
  isRestrictedAccountStatus,
  isRestrictedRoute,
} from '@/features/auth/accountState';
import { useSession } from '@/features/auth/useSession';
import { profileKeys, useMyProfile } from '@/features/profiles/hooks';
import { queryPersister } from '@/lib/offline/persist';

/**
 * Clears private cached data and limits a restricted account to appeal,
 * export, and deletion. The database remains authoritative if this component
 * is bypassed or an old build is still running.
 */
export function AccountStatusGate() {
  const session = useSession();
  const segments = useSegments();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useMyProfile();
  const clearedVersion = useRef<string | undefined>(undefined);
  const userId = session.session?.user.id;
  const restricted = profile
    ? isRestrictedAccountStatus(profile.account_status)
    : false;

  useEffect(() => {
    if (!restricted || !profile || !userId) return;

    const version = `${userId}:${profile.account_status}:${profile.account_status_version}`;
    if (clearedVersion.current === version) return;
    clearedVersion.current = version;

    // Preserve only the status row needed to render this gate. Everything else
    // in memory and on disk may contain private data from before suspension.
    queryClient.clear();
    queryClient.setQueryData(profileKeys.me(userId), profile);
    void queryPersister.removeClient();
  }, [profile, queryClient, restricted, userId]);

  useEffect(() => {
    if (
      session.status !== 'authenticated' ||
      isLoading ||
      !profile ||
      !restricted
    ) {
      return;
    }

    if (!isRestrictedRoute(segments)) {
      router.replace('/settings/restricted');
    }
  }, [isLoading, profile, restricted, segments, session.status]);

  return null;
}
