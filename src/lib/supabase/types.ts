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

export type PortraitStatus =
  'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';

export type PortraitElementKeyEnum =
  | 'introduction'
  | 'where_im_from'
  | 'today_i_feel'
  | 'something_i_love'
  | 'something_misunderstood'
  | 'ordinary_moment'
  | 'something_id_tell_the_world';

export type PortraitRow = {
  id: string;
  draw_id: string;
  user_id: string;
  status: PortraitStatus;
  photo_path: string | null;
  media_path: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Only the two paths are granted; the system owns the state columns. */
export type PortraitUpdate = {
  photo_path?: string | null | undefined;
  media_path?: string | null | undefined;
};

export type PortraitElementRow = {
  portrait_id: string;
  element_key: PortraitElementKeyEnum;
  answer: string;
  updated_at: string;
};

export type PortraitElementInsert = {
  portrait_id: string;
  element_key: PortraitElementKeyEnum;
  answer: string;
};

/**
 * What a guest sees of another person: a first name, a country, an optional
 * city, and a photograph. No surname, no age, no user id, and no counts.
 */
export type TodaysHumanRow = {
  draw_id: string;
  selection_date: string;
  human_number: number | null;
  display_name: string;
  country_code: string;
  city: string | null;
  photo_path: string | null;
  published_at: string | null;
};

export type PublicQuestionRow = {
  id: string;
  body: string;
  answer: string | null;
  answered_at: string | null;
  /** Votes on a question, never on a person (Article 9.3). */
  votes: number;
  has_voted: boolean | null;
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
      portraits: {
        Row: PortraitRow;
        Insert: never;
        Update: PortraitUpdate;
        Relationships: [];
      };
      portrait_elements: {
        Row: PortraitElementRow;
        Insert: PortraitElementInsert;
        Update: PortraitElementInsert;
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
      /** The candidate's own answer. Takes no argument: it is about the caller. */
      accept_selection: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      decline_selection: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      my_pending_invitation: {
        Args: Record<PropertyKey, never>;
        Returns: {
          invitation_id: string;
          selection_date: string;
          notified_at: string;
          acceptance_deadline: string;
          selection_status: SelectionStatus;
          portrait_status: PortraitStatus;
          portrait_element_key: PortraitElementKeyEnum;
          question_status: 'pending' | 'approved' | 'rejected';
        }[];
      };
      scheduler_installed: {
        Args: Record<PropertyKey, never>;
        Returns: { installed: boolean; detail: string; checked_at: string }[];
      };
      accept_community_rules: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      start_my_portrait: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      submit_my_portrait: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_todays_human: {
        Args: Record<PropertyKey, never>;
        Returns: TodaysHumanRow[];
      };
      get_portrait_elements: {
        Args: { target_draw: string };
        Returns: { element_key: PortraitElementKeyEnum; answer: string }[];
      };
      get_questions: {
        Args: { target_draw: string };
        Returns: PublicQuestionRow[];
      };
      ask_question: {
        Args: { target_draw: string; question_body: string };
        Returns: string;
      };
      vote_question: {
        Args: { target_question: string };
        Returns: boolean;
      };
      unvote_question: {
        Args: { target_question: string };
        Returns: boolean;
      };
      remember_human: {
        Args: { target_draw: string };
        Returns: boolean;
      };
      forget_human: {
        Args: { target_draw: string };
        Returns: boolean;
      };
      /** There is no counterpart that counts how many people do. */
      do_i_remember: {
        Args: { target_draw: string };
        Returns: boolean;
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
