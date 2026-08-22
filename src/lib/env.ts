import { z } from 'zod';

/**
 * Environment configuration, validated once at import time.
 *
 * Three environments from day one (Phase 1) — never one Supabase project used
 * for everything. Anything invalid fails loudly here rather than as a confusing
 * runtime error three screens later.
 */

const AppEnvSchema = z.enum(['development', 'staging', 'production']);

const EnvSchema = z.object({
  appEnv: AppEnvSchema,
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
});

export type AppEnv = z.infer<typeof AppEnvSchema>;
export type Env = z.infer<typeof EnvSchema>;

const raw = {
  appEnv: process.env.APP_ENV ?? 'development',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

const parsed = EnvSchema.safeParse(raw);

/**
 * True when Supabase credentials are present and well formed. The app is
 * expected to run without them (guest viewing degrades to an empty state)
 * rather than crash on a fresh checkout with no .env.
 */
export const isConfigured = parsed.success;

export const env: Env = parsed.success
  ? parsed.data
  : {
      appEnv: AppEnvSchema.safeParse(raw.appEnv).success
        ? (raw.appEnv as AppEnv)
        : 'development',
      supabaseUrl: '',
      supabaseAnonKey: '',
    };

export const configErrors: string[] = parsed.success
  ? []
  : parsed.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    );
