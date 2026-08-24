import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import type {
  AnniversaryRow,
  ArchiveEntryRow,
  ArchiveHumanRow,
  RememberedHumanRow,
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

export interface ArchiveCursor {
  selectionDate: string;
  drawId: string;
}

export interface RememberedCursor {
  rememberedAt: string;
  drawId: string;
}

export type ArchiveDisplayEntry = ArchiveEntryRow & {
  photo_url: string | null;
};

export type RememberedDisplayEntry = RememberedHumanRow & {
  photo_url: string | null;
};

export const ARCHIVE_PAGE_SIZE = 18;

export async function getArchivePage(
  filters: ArchiveFilters = {},
  cursor?: ArchiveCursor,
  limit = ARCHIVE_PAGE_SIZE
): Promise<ArchiveDisplayEntry[]> {
  const { data, error } = await getSupabase().rpc('get_archive_page', {
    filter_country: filters.country ?? null,
    filter_year: filters.year ?? null,
    page_limit: limit,
    before_date: cursor?.selectionDate ?? null,
    before_draw: cursor?.drawId ?? null,
  });

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return attachPhotoUrls(data ?? []);
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
): Promise<ArchiveDisplayEntry | null> {
  const { data, error } = await getSupabase().rpc('get_random_human', {
    filter_country: country ?? null,
  });

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return (await attachPhotoUrls(data ?? []))[0] ?? null;
}

/** One year ago today, and five, ten, twenty-five. Empty until it is true. */
export async function getAnniversaries(): Promise<
  (AnniversaryRow & { photo_url: string | null })[]
> {
  const { data, error } = await getSupabase().rpc('get_anniversaries');

  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return attachPhotoUrls(data ?? []);
}

export async function getYesterday(): Promise<ArchiveDisplayEntry | null> {
  const { data, error } = await getSupabase().rpc('get_yesterdays_human');
  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return (await attachPhotoUrls(data ?? []))[0] ?? null;
}

export async function getRememberedHumans(
  cursor?: RememberedCursor,
  limit = ARCHIVE_PAGE_SIZE
): Promise<RememberedDisplayEntry[]> {
  const { data, error } = await getSupabase().rpc('get_remembered_humans', {
    page_limit: limit,
    before_remembered_at: cursor?.rememberedAt ?? null,
    before_draw: cursor?.drawId ?? null,
  });
  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return attachPhotoUrls(data ?? []);
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

/** One storage round-trip per page, not one per portrait card. */
export async function signArchivePhotos(
  paths: (string | null)[]
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(paths.filter((path): path is string => Boolean(path))),
  ];
  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await getSupabase()
    .storage.from('portraits')
    .createSignedUrls(unique, 3600);
  if (error || !data) {
    return new Map();
  }

  const urls = new Map<string, string>();
  data.forEach((item) => {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  });
  return urls;
}

async function attachPhotoUrls<T extends { photo_path: string | null }>(
  entries: T[]
): Promise<(T & { photo_url: string | null })[]> {
  const urls = await signArchivePhotos(
    entries.map((entry) => entry.photo_path)
  );
  return entries.map((entry) => ({
    ...entry,
    photo_url: entry.photo_path ? (urls.get(entry.photo_path) ?? null) : null,
  }));
}
