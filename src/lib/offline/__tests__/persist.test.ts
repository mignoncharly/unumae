import {
  MAX_AGE_MS,
  PERSISTED_PREFIXES,
  isPersistedKey,
  persistOptions,
} from '../persist';

/** Minimal stand-in for what shouldDehydrateQuery actually receives. */
function query(key: unknown[], status: 'success' | 'error' | 'pending') {
  return { queryKey: key, state: { status } } as never;
}

const shouldPersist = (
  key: unknown[],
  status: 'success' | 'error' | 'pending'
) => persistOptions.dehydrateOptions!.shouldDehydrateQuery!(query(key, status));

/**
 * A cache is the thing nobody remembers to clear, so what goes into it is an
 * allowlist rather than a blocklist — a private query added later is not
 * cached by default.
 */
describe('what survives on disk', () => {
  it.each([
    ['todays-human'],
    ['archive'],
    ['archive-human'],
    ['anniversaries'],
  ])('keeps %s, because it is public and worth rereading offline', (key) => {
    expect(shouldPersist([key], 'success')).toBe(true);
  });

  it.each([
    ['profile'],
    ['questions'],
    ['has-been-selected'],
    ['invitation'],
    ['remembered'],
    ['moderation'],
    ['notification-settings'],
  ])('never keeps %s', (key) => {
    // Private, or a permission. Neither belongs in a cache on disk.
    expect(shouldPersist([key], 'success')).toBe(false);
  });

  it('keeps nothing that failed', () => {
    // Caching an error would show a stale failure to somebody who has since
    // come back online.
    expect(shouldPersist(['todays-human'], 'error')).toBe(false);
    expect(shouldPersist(['todays-human'], 'pending')).toBe(false);
  });

  it('ignores a key that is not a string', () => {
    expect(shouldPersist([{ weird: true }], 'success')).toBe(false);
    expect(shouldPersist([], 'success')).toBe(false);
  });

  it('exposes the allowlist so it can be reasoned about', () => {
    expect(PERSISTED_PREFIXES.every(isPersistedKey)).toBe(true);
    expect(isPersistedKey('profile')).toBe(false);
  });
});

describe('how long it survives', () => {
  it('outlives a cycle, so yesterday is still there this morning', () => {
    expect(MAX_AGE_MS).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
  });

  it('does not keep anything for a week', () => {
    // Long enough to be useful offline, short enough that nobody is reading a
    // Human from last Tuesday believing it is today's.
    expect(MAX_AGE_MS).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);
  });
});
