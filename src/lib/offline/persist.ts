import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

/**
 * Keeping Today's Human readable without a connection.
 *
 * The plan is direct about why: this product is international from day one, and
 * a story that only loads on good wifi is a story most of the world cannot
 * read. Once a cycle has been fetched, it stays readable.
 *
 * What is deliberately *not* persisted: anything private. The moderation
 * queues, a person's own profile, their library — none of it should survive on
 * disk in a cache, because a cache is the thing nobody remembers to clear.
 */

const CACHE_KEY = 'unumae.query-cache';

/** A day. Longer than a cycle, so yesterday's Human is still there this morning. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Query keys whose data is public and worth keeping.
 *
 * An allowlist rather than a blocklist: a new private query added later is not
 * cached by default, which is the right way round to be wrong.
 */
const PERSISTED_PREFIXES = [
  'todays-human',
  'archive',
  'archive-human',
  'anniversaries',
  'archive-countries',
  'archive-years',
];

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_KEY,
  throttleTime: 2000,
});

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: queryPersister,
  maxAge: MAX_AGE_MS,
  // Invalidates caches written before personalized question results were
  // removed from the persistence allowlist.
  buster: 'phase2-privacy-v1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const first = query.queryKey[0];
      if (typeof first !== 'string') {
        return false;
      }

      // Only successful results: caching an error would mean showing a stale
      // failure to somebody who has since come back online.
      return (
        query.state.status === 'success' && PERSISTED_PREFIXES.includes(first)
      );
    },
  },
};

export function isPersistedKey(key: unknown): boolean {
  return typeof key === 'string' && PERSISTED_PREFIXES.includes(key);
}

export { CACHE_KEY, MAX_AGE_MS, PERSISTED_PREFIXES };
