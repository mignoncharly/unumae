import { useMutation, useQuery } from '@tanstack/react-query';

import {
  getAnniversaries,
  getArchive,
  getArchiveCountries,
  getArchiveYears,
  getHuman,
  getRandomHuman,
  type ArchiveFilters,
} from './api';

export const archiveKeys = {
  list: (filters: ArchiveFilters) => ['archive', filters] as const,
  human: (drawId: string) => ['archive-human', drawId] as const,
  anniversaries: ['anniversaries'] as const,
  countries: ['archive-countries'] as const,
  years: ['archive-years'] as const,
};

/**
 * The Archive is permanent and append-only: a page fetched today is the same
 * page tomorrow, apart from one new Human at the front. Long stale times are
 * correct here rather than merely convenient.
 */
const ARCHIVE_STALE_TIME = 10 * 60 * 1000;

export function useArchive(filters: ArchiveFilters = {}) {
  return useQuery({
    queryKey: archiveKeys.list(filters),
    queryFn: () => getArchive(filters),
    staleTime: ARCHIVE_STALE_TIME,
  });
}

export function useHuman(drawId: string | undefined) {
  return useQuery({
    queryKey: archiveKeys.human(drawId ?? 'none'),
    queryFn: () => getHuman(drawId!),
    enabled: Boolean(drawId),
    staleTime: ARCHIVE_STALE_TIME,
  });
}

export function useAnniversaries() {
  return useQuery({
    queryKey: archiveKeys.anniversaries,
    queryFn: getAnniversaries,
    staleTime: ARCHIVE_STALE_TIME,
  });
}

export function useArchiveCountries() {
  return useQuery({
    queryKey: archiveKeys.countries,
    queryFn: getArchiveCountries,
    staleTime: ARCHIVE_STALE_TIME,
  });
}

export function useArchiveYears() {
  return useQuery({
    queryKey: archiveKeys.years,
    queryFn: getArchiveYears,
    staleTime: ARCHIVE_STALE_TIME,
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
