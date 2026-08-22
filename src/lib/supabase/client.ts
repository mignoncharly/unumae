import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { env, isConfigured } from '@/lib/env';

import type { Database } from './types';

/**
 * The anon key is public by design. It is safe in the client only because Row
 * Level Security is enabled on every table — see docs/SECURITY.md. Any table
 * added without RLS is a security bug, not a shortcut.
 */
let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!isConfigured) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env and fill it in.'
    );
  }

  client ??= createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // No URL-based session detection: this is a native app, and the web
      // surface (Phase 11) is read-only.
      detectSessionInUrl: false,
    },
  });

  return client;
}

export type ConnectionStatus =
  'not-configured' | 'checking' | 'connected' | 'failed';

/**
 * A cheap reachability probe used by Settings → Supabase connection, which is
 * one of the Phase 1 "done" criteria. It deliberately touches auth rather than
 * a table, so it keeps working before any table exists.
 */
export async function checkConnection(): Promise<ConnectionStatus> {
  if (!isConfigured) {
    return 'not-configured';
  }

  try {
    const { error } = await getSupabase().auth.getSession();
    return error ? 'failed' : 'connected';
  } catch {
    return 'failed';
  }
}

/** Test seam: forget the memoised client. */
export function resetSupabaseClient(): void {
  client = null;
}
