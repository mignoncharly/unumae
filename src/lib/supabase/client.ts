import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { env, isConfigured } from '@/lib/env';

import { secureSessionStorage } from './secureStorage';

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
      // The Keychain, not a plaintext file in the app container. See
      // ./secureStorage.ts for the size and migration handling that needs.
      storage: secureSessionStorage,
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
 * Reachability probe used by Settings → Supabase connection.
 *
 * It hits GoTrue's /health over the network on purpose. `auth.getSession()`
 * would be cheaper but reads local storage, so it reports success on a plane
 * with no signal — a probe that cannot fail is not a probe.
 *
 * /health is chosen over a table query so it keeps working before any table
 * exists, and over /rest/v1/ which requires a secret key.
 */
export async function checkConnection(
  timeoutMs = 5000
): Promise<ConnectionStatus> {
  if (!isConfigured) {
    return 'not-configured';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${env.supabaseUrl}/auth/v1/health`, {
      headers: { apikey: env.supabaseAnonKey },
      signal: controller.signal,
    });
    return response.ok ? 'connected' : 'failed';
  } catch {
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}

/** Test seam: forget the memoised client. */
export function resetSupabaseClient(): void {
  client = null;
}
