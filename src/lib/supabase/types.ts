/**
 * Database types.
 *
 * Hand-written to match supabase/migrations exactly. To regenerate instead:
 *   npm run db:types                     (needs Docker, or a local stack)
 *   npx supabase gen types typescript --project-id <ref>   (needs an access token)
 *
 * The Insert and Update shapes deliberately mirror the column-level GRANTs in
 * the migration rather than the full table. A user cannot write
 * `selection_eligible`, `verification_level`, `account_status` or
 * `accepted_rules_at`, and cannot update `birth_year` — so those fields are
 * absent here and the compiler enforces what Postgres enforces.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AccountStatus = 'active' | 'suspended' | 'banned' | 'deleted';

export type VerificationLevel =
  'none' | 'email' | 'device' | 'phone' | 'liveness';

export type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  birth_year: number;
  country_code: string;
  city: string | null;
  languages: string[];
  avatar_path: string | null;
  bio_short: string | null;
  selection_eligible: boolean;
  verification_level: VerificationLevel;
  account_status: AccountStatus;
  accepted_rules_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Columns the `authenticated` role may INSERT. */
export type ProfileInsert = {
  id: string;
  username: string;
  display_name: string;
  birth_year: number;
  country_code: string;
  city?: string | null | undefined;
  languages?: string[] | undefined;
  avatar_path?: string | null | undefined;
  bio_short?: string | null | undefined;
};

/** Columns the `authenticated` role may UPDATE. `birth_year` is not one. */
export type ProfileUpdate = {
  username?: string | undefined;
  display_name?: string | undefined;
  country_code?: string | undefined;
  city?: string | null | undefined;
  languages?: string[] | undefined;
  avatar_path?: string | null | undefined;
  bio_short?: string | null | undefined;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      account_status: AccountStatus;
      verification_level: VerificationLevel;
    };
    CompositeTypes: Record<never, never>;
  };
};
