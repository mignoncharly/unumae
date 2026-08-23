// Test environment defaults. Real credentials never live here — the Supabase
// client is constructed lazily so that unit tests never touch the network.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

/*
 * AsyncStorage is a native module, so importing anything that touches it —
 * the query persister, the preferences store — fails outright under Jest.
 * The library ships a mock for exactly this.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

/** Offline by default would be misleading; tests assume a working connection. */
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: () => () => undefined,
  fetch: async () => ({ isConnected: true, isInternetReachable: true }),
}));
