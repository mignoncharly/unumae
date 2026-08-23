import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';

/**
 * The transparency numbers (Article 12).
 *
 * Public, including guests — the people most entitled to be sceptical about a
 * fairness claim are the ones who have not signed up, and "one in a thousand"
 * is not checkable by somebody who cannot see how many are waiting.
 */

export interface SelectionStats {
  /** People in the pool, counted exactly the way the draw counts them. */
  waiting: number;
  countries: number;
  languages: number;
  humansPublished: number;
  archiveCountries: number;
}

export async function getSelectionStats(): Promise<SelectionStats | null> {
  const { data, error } = await getSupabase().rpc('selection_stats');
  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }

  const row = data?.[0];
  if (!row) {
    return null;
  }

  return {
    waiting: row.waiting,
    countries: row.countries,
    languages: row.languages,
    humansPublished: row.humans_published,
    archiveCountries: row.archive_countries,
  };
}

export interface CountryRepresentation {
  countryCode: string;
  waiting: number;
}

/**
 * Countries with at least five people waiting.
 *
 * The floor is in the database, not here. A country with two people in the pool
 * is a country where being drawn identifies you, and the Archive would confirm
 * it the same day.
 */
export async function getCountryRepresentation(): Promise<
  CountryRepresentation[]
> {
  const { data, error } = await getSupabase().rpc('country_representation');
  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }

  return (data ?? []).map((row) => ({
    countryCode: row.country_code,
    waiting: row.waiting,
  }));
}

export interface UnnamedCountries {
  countries: number;
  waiting: number;
}

/** The remainder, so the named countries plus this equals `waiting`. */
export async function getUnnamedCountries(): Promise<UnnamedCountries> {
  const { data, error } = await getSupabase().rpc('unnamed_countries');
  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }

  const row = data?.[0];
  return { countries: row?.countries ?? 0, waiting: row?.waiting ?? 0 };
}
