import { useQuery } from '@tanstack/react-query';

import {
  getCountryRepresentation,
  getSelectionStats,
  getUnnamedCountries,
} from './api';

export const statsKeys = {
  selection: ['selection-stats'] as const,
  countries: ['country-representation'] as const,
  unnamed: ['unnamed-countries'] as const,
};

/**
 * The pool changes once a night, when eligibility is refreshed. Anything more
 * eager than an hour would be watching a number that cannot move.
 */
const STATS_STALE_TIME = 60 * 60 * 1000;

export function useSelectionStats() {
  return useQuery({
    queryKey: statsKeys.selection,
    queryFn: getSelectionStats,
    staleTime: STATS_STALE_TIME,
  });
}

export function useCountryRepresentation(enabled = true) {
  return useQuery({
    queryKey: statsKeys.countries,
    queryFn: getCountryRepresentation,
    enabled,
    staleTime: STATS_STALE_TIME,
  });
}

export function useUnnamedCountries(enabled = true) {
  return useQuery({
    queryKey: statsKeys.unnamed,
    queryFn: getUnnamedCountries,
    enabled,
    staleTime: STATS_STALE_TIME,
  });
}
