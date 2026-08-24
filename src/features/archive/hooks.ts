import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';

import {
  getAnniversaries,
  ARCHIVE_PAGE_SIZE,
  getArchivePage,
  getArchiveCountries,
  getArchiveYears,
  getHuman,
  getRememberedHumans,
  getRandomHuman,
  getYesterday,
  type ArchiveCursor,
  type ArchiveFilters,
  type RememberedCursor,
} from './api';

export const archiveKeys = {
  list: (filters: ArchiveFilters, viewer: string) =>
    ['archive', filters, viewer] as const,
  human: (drawId: string, viewer: string) =>
    ['archive-human', drawId, viewer] as const,
  anniversaries: (viewer: string) => ['anniversaries', viewer] as const,
  countries: (viewer: string) => ['archive-countries', viewer] as const,
  years: (viewer: string) => ['archive-years', viewer] as const,
  yesterday: (viewer: string) => ['archive-yesterday', viewer] as const,
  remembered: (userId: string) => ['remembered-humans', userId] as const,
};

function useViewer() {
  const session = useSession();
  return {
    key: session.session?.user.id ?? 'guest',
    ready: session.status !== 'loading',
  };
}

/**
 * The Archive is permanent and append-only: a page fetched today is the same
 * page tomorrow, apart from one new Human at the front. Long stale times are
 * correct here rather than merely convenient.
 */
const ARCHIVE_STALE_TIME = 10 * 60 * 1000;

export function useArchive(filters: ArchiveFilters = {}) {
  const viewer = useViewer();
  return useInfiniteQuery({
    queryKey: archiveKeys.list(filters, viewer.key),
    queryFn: ({ pageParam }) => getArchivePage(filters, pageParam),
    initialPageParam: undefined as ArchiveCursor | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < ARCHIVE_PAGE_SIZE) return undefined;
      const last = lastPage.at(-1);
      return last
        ? { selectionDate: last.selection_date, drawId: last.draw_id }
        : undefined;
    },
    staleTime: ARCHIVE_STALE_TIME,
    enabled: viewer.ready,
  });
}

export function useYesterday() {
  const viewer = useViewer();
  return useQuery({
    queryKey: archiveKeys.yesterday(viewer.key),
    queryFn: getYesterday,
    staleTime: ARCHIVE_STALE_TIME,
    enabled: viewer.ready,
  });
}

export function useRememberedHumans(enabled = true) {
  const session = useSession();
  const userId = session.session?.user.id ?? 'anonymous';
  return useInfiniteQuery({
    queryKey: archiveKeys.remembered(userId),
    queryFn: ({ pageParam }) => getRememberedHumans(pageParam),
    initialPageParam: undefined as RememberedCursor | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < ARCHIVE_PAGE_SIZE) return undefined;
      const last = lastPage.at(-1);
      return last
        ? { rememberedAt: last.remembered_at, drawId: last.draw_id }
        : undefined;
    },
    staleTime: ARCHIVE_STALE_TIME,
    enabled: enabled && session.status === 'authenticated',
  });
}

export function useHuman(drawId: string | undefined) {
  const viewer = useViewer();
  return useQuery({
    queryKey: archiveKeys.human(drawId ?? 'none', viewer.key),
    queryFn: () => getHuman(drawId!),
    enabled: Boolean(drawId) && viewer.ready,
    staleTime: ARCHIVE_STALE_TIME,
  });
}

export function useAnniversaries() {
  const viewer = useViewer();
  return useQuery({
    queryKey: archiveKeys.anniversaries(viewer.key),
    queryFn: getAnniversaries,
    staleTime: ARCHIVE_STALE_TIME,
    enabled: viewer.ready,
  });
}

export function useArchiveCountries() {
  const viewer = useViewer();
  return useQuery({
    queryKey: archiveKeys.countries(viewer.key),
    queryFn: getArchiveCountries,
    staleTime: ARCHIVE_STALE_TIME,
    enabled: viewer.ready,
  });
}

export function useArchiveYears() {
  const viewer = useViewer();
  return useQuery({
    queryKey: archiveKeys.years(viewer.key),
    queryFn: getArchiveYears,
    staleTime: ARCHIVE_STALE_TIME,
    enabled: viewer.ready,
  });
}

/**
 * A mutation rather than a query: pressing "Random Human" twice should give
 * two different people, and a cached query would give the same one.
 */
export function useRandomHuman() {
  return useMutation({
    mutationFn: (country?: string | null) => getRandomHuman(country),
  });
}
