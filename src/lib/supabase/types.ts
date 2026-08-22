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
  wants_selection: boolean;
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
  wants_selection?: boolean | undefined;
  username?: string | undefined;
  display_name?: string | undefined;
  country_code?: string | undefined;
  city?: string | null | undefined;
  languages?: string[] | undefined;
  avatar_path?: string | null | undefined;
  bio_short?: string | null | undefined;
};

export type SelectionStatus =
  | 'scheduled'
  | 'selected'
  | 'awaiting_acceptance'
  | 'accepted'
  | 'content_review'
  | 'ready'
  | 'live'
  | 'completed'
  | 'cancelled'
  | 'replacement_required';

/**
 * Only the columns a client is actually granted (Article 12's transparency
 * set). `selected_user_id` and the backups are deliberately absent: no client
 * role can read them, so a pending draw cannot leak tomorrow's human, and the
 * compiler stops anyone trying.
 */
export type DailyDrawPublicRow = {
  selection_date: string;
  draw_version: number;
  candidate_pool_hash: string;
  candidate_count: number;
  random_seed: string;
  selection_status: SelectionStatus;
  published_at: string | null;
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
      daily_draws: {
        Row: DailyDrawPublicRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      /**
       * Takes no argument on purpose: it answers about the caller and cannot
       * be aimed at anyone else.
       */
      has_been_selected: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_eligible: {
        Args: { candidate_id: string };
        Returns: boolean;
      };
      /** Public verification surface (Article 12). */
      draw_rank: {
        Args: { seed: string; candidate: string };
        Returns: string;
      };
      draw_order: {
        Args: { seed: string; ids: string[] };
        Returns: string[];
      };
      pool_hash: {
        Args: { ids: string[] };
        Returns: string;
      };
    };
    Enums: {
      account_status: AccountStatus;
      verification_level: VerificationLevel;
      selection_status: SelectionStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};
