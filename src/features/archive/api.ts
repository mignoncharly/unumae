import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import type {
  AnniversaryRow,
  ArchiveEntryRow,
  ArchiveHumanRow,
} from '@/lib/supabase/types';

/**
 * The Human Archive.
 *
 * Article 9.5 fixes the ways it may be browsed — Today, Yesterday, One year
 * ago, Random, Country, Year — and there is deliberately no sort parameter
 * anywhere in this file. The database orders chronologically; nothing here can
 * ask it to do otherwise.
 */

export interface ArchiveFilters {
  country?: string | null;
  year?: number | null;
}

export async function getArchive(
  filters: ArchiveFilters = {},
  limit = 30,
  offset = 0
): Promise<ArchiveEntryRow[]> {
  const { data, error } = await getSupabase().rpc('get_archive', {
    filter_country: filters.country ?? null,
    filter_year: filters.year ?? null,
    page_limit: limit,
    page_offset: offset,
  });

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return data ?? [];
}

export async function getHuman(
  drawId: string
): Promise<ArchiveHumanRow | null> {
  const { data, error } = await getSupabase().rpc('get_human', {
    target_draw: drawId,
  });

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return data?.[0] ?? null;
}

export async function getRandomHuman(
  country?: string | null
): Promise<ArchiveEntryRow | null> {
  const { data, error } = await getSupabase().rpc('get_random_human', {
    filter_country: country ?? null,
  });

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return data?.[0] ?? null;
}

/** One year ago today, and five, ten, twenty-five. Empty until it is true. */
export async function getAnniversaries(): Promise<AnniversaryRow[]> {
  const { data, error } = await getSupabase().rpc('get_anniversaries');

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return data ?? [];
}

export async function getArchiveCountries() {
  const { data, error } = await getSupabase().rpc('get_archive_countries');

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return data ?? [];
}

export async function getArchiveYears() {
  const { data, error } = await getSupabase().rpc('get_archive_years');

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return data ?? [];
}

/**
 * Signs a stored photo path for an hour. Returns null rather than throwing:
 * a missing photograph should not empty an entire Archive page.
 */
export async function signArchivePhoto(
  path: string | null
): Promise<string | null> {
  if (!path) {
    return null;
  }

  const { data, error } = await getSupabase()
    .storage.from('portraits')
    .createSignedUrl(path, 3600);

  return error ? null : (data?.signedUrl ?? null);
}
