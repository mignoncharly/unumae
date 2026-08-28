import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Where the Supabase session actually lives.
 *
 * The access and refresh tokens are the account. Left in AsyncStorage they sit
 * in a plaintext file inside the app container — protected by the sandbox and
 * by file-level encryption while the device is locked, and by nothing else.
 * The Keychain is what that material is for, and this app already reaches for
 * it elsewhere: App Attest key ids and the analytics session token are both
 * kept in `expo-secure-store`. The session was the one thing that was not.
 *
 * Two things make this more than a one-line swap.
 *
 * **Size.** The Keychain is relaxed about item size; the Android keystore
 * backing is not, and rejects values past roughly 2 KB. A Supabase session is
 * a JSON envelope around two JWTs and the user record, which clears that
 * comfortably. So values are split across numbered items with a small manifest
 * under the real key. iOS does not need this, but Android is kept configured
 * for portability and a storage layer that works on one platform is a trap for
 * whoever turns the other one on.
 *
 * **Anybody already signed in.** TestFlight builds stored sessions in
 * AsyncStorage. Reading a key that is not here yet falls back to the old
 * location once, moves what it finds, and deletes the original — so the
 * upgrade does not sign anyone out.
 */

/** Conservative: the Android limit is ~2048 bytes including overhead. */
const MAX_CHUNK_BYTES = 1600;

const MANIFEST_VERSION = 1;

interface Manifest {
  v: number;
  n: number;
}

const encoder = new TextEncoder();

function chunkKey(key: string, index: number): string {
  return `${key}.${index}`;
}

/**
 * Splits on character boundaries while measuring in bytes.
 *
 * Slicing a fixed number of characters would be wrong in both directions: a
 * run of ASCII wastes most of each item, and a display name in a script with
 * multi-byte characters overflows one. Splitting on a fixed number of *bytes*
 * would be worse — it can cut a character in half and corrupt the value.
 */
export function chunkByBytes(value: string, limit = MAX_CHUNK_BYTES): string[] {
  if (value === '') return [''];

  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;

  // Iterating the string yields whole code points, so a surrogate pair is
  // never split across two items.
  for (const character of value) {
    const size = encoder.encode(character).length;
    if (currentBytes + size > limit && current !== '') {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += character;
    currentBytes += size;
  }
  chunks.push(current);
  return chunks;
}

function parseManifest(raw: string | null): Manifest | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Manifest>;
    if (parsed.v !== MANIFEST_VERSION) return null;
    if (typeof parsed.n !== 'number' || parsed.n < 1) return null;
    return { v: parsed.v, n: parsed.n };
  } catch {
    return null;
  }
}

/**
 * Removes a value and every chunk it may have had.
 *
 * `extra` exists because a shorter value leaves the tail of a longer one
 * behind. Those orphans are never read — the manifest bounds the read — but a
 * stale fragment of a previous session should not outlive it in the Keychain.
 */
async function removeAll(key: string, extra = 0): Promise<void> {
  const manifest = parseManifest(await SecureStore.getItemAsync(key));
  const count = Math.max(manifest?.n ?? 0, extra);
  await SecureStore.deleteItemAsync(key).catch(() => undefined);
  for (let index = 0; index < count; index += 1) {
    await SecureStore.deleteItemAsync(chunkKey(key, index)).catch(
      () => undefined
    );
  }
}

async function readFromSecureStore(key: string): Promise<string | null> {
  const manifest = parseManifest(await SecureStore.getItemAsync(key));
  if (!manifest) return null;

  let value = '';
  for (let index = 0; index < manifest.n; index += 1) {
    const part = await SecureStore.getItemAsync(chunkKey(key, index));
    // A missing chunk means a partial write. Half a session is not a session:
    // discard it and let the app sign in again rather than hand Supabase a
    // truncated token it will fail on in a less obvious place.
    if (part === null) {
      await removeAll(key);
      return null;
    }
    value += part;
  }
  return value;
}

async function writeToSecureStore(key: string, value: string): Promise<void> {
  const chunks = chunkByBytes(value);
  await removeAll(key, chunks.length);
  for (const [index, chunk] of chunks.entries()) {
    await SecureStore.setItemAsync(chunkKey(key, index), chunk);
  }
  // The manifest is written last, so an interrupted write leaves no manifest
  // and therefore reads as absent rather than as a corrupt value.
  await SecureStore.setItemAsync(
    key,
    JSON.stringify({ v: MANIFEST_VERSION, n: chunks.length } satisfies Manifest)
  );
}

let availability: Promise<boolean> | null = null;

/**
 * The Keychain does not exist on web, where this app is a read-only surface.
 * Rather than fail every session read there, fall back to the previous
 * behaviour — which is what web already had.
 */
function isSecureStoreAvailable(): Promise<boolean> {
  availability ??= SecureStore.isAvailableAsync().catch(() => false);
  return availability;
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!(await isSecureStoreAvailable())) {
      return AsyncStorage.getItem(key);
    }

    const stored = await readFromSecureStore(key);
    if (stored !== null) return stored;

    // One-time migration out of the old location.
    const legacy = await AsyncStorage.getItem(key);
    if (legacy === null) return null;
    await writeToSecureStore(key, legacy);
    await AsyncStorage.removeItem(key);
    return legacy;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!(await isSecureStoreAvailable())) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await writeToSecureStore(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (!(await isSecureStoreAvailable())) {
      await AsyncStorage.removeItem(key);
      return;
    }
    await removeAll(key);
    // Signing out must also clear anything the migration has not reached yet.
    await AsyncStorage.removeItem(key).catch(() => undefined);
  },
};

/** Test seam: forget the memoised availability probe. */
export function resetSecureStorageAvailability(): void {
  availability = null;
}

export { MAX_CHUNK_BYTES };
