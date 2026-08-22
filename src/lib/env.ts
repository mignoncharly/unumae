import { z } from 'zod';

/**
 * Configuration, validated once at import time.
 *
 * One Supabase project for the whole lifecycle — there is deliberately no
 * environment switch here. See docs/ENVIRONMENTS.md for why that decision was
 * taken and what it costs.
 *
 * Anything invalid fails loudly here rather than as a confusing runtime error
 * three screens later.
 */
const EnvSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
});

export type Env = z.infer<typeof EnvSchema>;

const raw = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

const parsed = EnvSchema.safeParse(raw);

/**
 * True when Supabase credentials are present and well formed. The app is
 * expected to run without them — guest viewing degrades to an empty state
 * rather than crashing on a fresh checkout with no .env.
 */
export const isConfigured = parsed.success;

export const env: Env = parsed.success
  ? parsed.data
  : { supabaseUrl: '', supabaseAnonKey: '' };

export const configErrors: string[] = parsed.success
  ? []
  : parsed.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    );

/** `qpicjsjxdblrxdrdibge`. Not a secret — it is the host name. */
export const projectRef: string =
  /https:\/\/([a-z0-9]+)\.supabase\./.exec(env.supabaseUrl)?.[1] ?? 'unknown';
