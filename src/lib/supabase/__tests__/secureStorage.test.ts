const mockSecure = new Map<string, string>();
const mockAsync = new Map<string, string>();
let mockAvailable = true;

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: () => Promise.resolve(mockAvailable),
  getItemAsync: (key: string) => Promise.resolve(mockSecure.get(key) ?? null),
  setItemAsync: (key: string, value: string) => {
    mockSecure.set(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    mockSecure.delete(key);
    return Promise.resolve();
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (key: string) => Promise.resolve(mockAsync.get(key) ?? null),
  setItem: (key: string, value: string) => {
    mockAsync.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    mockAsync.delete(key);
    return Promise.resolve();
  },
}));

// eslint-disable-next-line import/first
import {
  chunkByBytes,
  MAX_CHUNK_BYTES,
  resetSecureStorageAvailability,
  secureSessionStorage,
} from '../secureStorage';

const KEY = 'sb-qpicjsjxdblrxdrdibge-auth-token';
const bytes = (value: string) => new TextEncoder().encode(value).length;

/** A session envelope large enough to exceed a single keystore item. */
function largeSession(): string {
  return JSON.stringify({
    access_token: `a.${'x'.repeat(1400)}.b`,
    refresh_token: 'r'.repeat(600),
    user: { name: 'Zoë Ǆurđević 中文 🌍'.repeat(20) },
  });
}

describe('chunkByBytes', () => {
  it('never exceeds the keystore item limit', () => {
    for (const chunk of chunkByBytes(largeSession())) {
      expect(bytes(chunk)).toBeLessThanOrEqual(MAX_CHUNK_BYTES);
    }
  });

  it('never splits a character or a surrogate pair', () => {
    // Emoji are surrogate pairs in JS; a byte-indexed split corrupts them.
    const value = '🌍'.repeat(2000);
    const chunks = chunkByBytes(value);

    expect(chunks.join('')).toBe(value);
    // A complete emoji ends in a low surrogate, which is fine. What must never
    // appear is an *unpaired* one — the signature of a byte-indexed split.
    const loneSurrogate =
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
    for (const chunk of chunks) {
      expect(chunk).not.toMatch(loneSurrogate);
    }
  });

  it('packs by bytes rather than characters', () => {
    // The same byte budget, whether it arrives as one-byte or four-byte
    // characters. Slicing a fixed character count would fail this.
    const ascii = chunkByBytes('a'.repeat(8000)).length;
    const wide = chunkByBytes('🌍'.repeat(2000)).length;
    expect(ascii).toBe(wide);
  });
});

describe('secure session storage', () => {
  beforeEach(() => {
    mockSecure.clear();
    mockAsync.clear();
    mockAvailable = true;
    resetSecureStorageAvailability();
  });

  it('round-trips a session larger than one keystore item', async () => {
    const session = largeSession();
    await secureSessionStorage.setItem(KEY, session);

    expect(bytes(session)).toBeGreaterThan(MAX_CHUNK_BYTES);
    expect(await secureSessionStorage.getItem(KEY)).toBe(session);
  });

  it('keeps nothing in AsyncStorage once it owns the session', async () => {
    await secureSessionStorage.setItem(KEY, largeSession());
    expect(mockAsync.size).toBe(0);
  });

  it('migrates an existing session out of AsyncStorage exactly once', async () => {
    mockAsync.set(KEY, largeSession());

    expect(await secureSessionStorage.getItem(KEY)).toBe(largeSession());
    // The old copy must not survive the migration.
    expect(mockAsync.has(KEY)).toBe(false);
    // And the value is now served from the Keychain.
    expect(await secureSessionStorage.getItem(KEY)).toBe(largeSession());
  });

  it('leaves no orphan chunks when a shorter session replaces a longer one', async () => {
    await secureSessionStorage.setItem(KEY, largeSession());
    await secureSessionStorage.setItem(KEY, 'small');

    expect(await secureSessionStorage.getItem(KEY)).toBe('small');
    expect(
      [...mockSecure.keys()].filter((key) => key.startsWith(`${KEY}.`))
    ).toHaveLength(1);
  });

  it('treats a partially written session as absent rather than truncated', async () => {
    await secureSessionStorage.setItem(KEY, largeSession());
    mockSecure.delete(`${KEY}.1`);

    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
    // The remains are cleared, not left for the next read to trip over.
    expect([...mockSecure.keys()]).toHaveLength(0);
  });

  it('removes every chunk on sign-out', async () => {
    await secureSessionStorage.setItem(KEY, largeSession());
    await secureSessionStorage.removeItem(KEY);

    expect([...mockSecure.keys()]).toHaveLength(0);
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('falls back to AsyncStorage where there is no keychain', async () => {
    mockAvailable = false;
    resetSecureStorageAvailability();

    await secureSessionStorage.setItem(KEY, 'web-session');

    expect(mockSecure.size).toBe(0);
    expect(await secureSessionStorage.getItem(KEY)).toBe('web-session');
  });
});
