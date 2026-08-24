import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { queryPersister } from '@/lib/offline/persist';

const CACHE_IDENTITY_KEY = 'unumae.query-cache-identity';

/**
 * Reconciles the restored auth account before private queries can mount.
 * A different account (including signed-in -> guest) gets an empty memory and
 * disk cache, so no profile, vote state or moderation data can cross sessions.
 */
export function SessionCacheBoundary({ children }: { children: ReactNode }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [readyIdentity, setReadyIdentity] = useState<string | null>(null);
  const identity =
    session.status === 'authenticated' ? session.session.user.id : 'guest';

  useEffect(() => {
    if (session.status === 'loading') {
      return;
    }

    let active = true;
    void (async () => {
      try {
        const previous = await AsyncStorage.getItem(CACHE_IDENTITY_KEY);
        // A missing marker can be an upgrade from a build that persisted
        // private queries without associating them with an account. Treat it
        // as untrusted too; clearing an empty first-install cache is harmless.
        if (previous !== identity) {
          queryClient.clear();
          await queryPersister.removeClient();
        }
        await AsyncStorage.setItem(CACHE_IDENTITY_KEY, identity);
      } catch {
        // A cache failure must never strand the app on a blank launch. Memory
        // is cleared because it is the privacy-safe fallback.
        queryClient.clear();
      } finally {
        if (active) setReadyIdentity(identity);
      }
    })();

    return () => {
      active = false;
    };
  }, [identity, queryClient, session.status]);

  if (session.status === 'loading' || readyIdentity !== identity) {
    return null;
  }

  return children;
}

export { CACHE_IDENTITY_KEY };
