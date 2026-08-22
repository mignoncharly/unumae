// Test environment defaults. Real credentials never live here — the Supabase
// client is constructed lazily so that unit tests never touch the network.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
