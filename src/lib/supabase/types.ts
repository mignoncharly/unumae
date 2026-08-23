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
  city_hidden: boolean;
  locale: string;
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
  city_hidden?: boolean | undefined;
  locale?: string | undefined;
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
  portrait_id: string;
  selection_date: string;
  human_number: number | null;
  display_name: string;
  country_code: string;
  city: string | null;
  photo_path: string | null;
  published_at: string | null;
  /**
   * Joined during Year Zero. Derived from the join date, never stored, and
   * carrying no advantage of any kind — a Founding Human is drawn on exactly
   * the same terms as anybody else.
   */
  founding: boolean | null;
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

/**
 * An Archive entry.
 *
 * Everything except the number and the date is nullable, because Article 8.6
 * lets a person leave: the row survives as a tombstone so the sequence stays
 * complete, and the identity does not. `is_removed` says which case this is,
 * so no screen has to infer it from a missing name.
 */
export type ArchiveEntryRow = {
  draw_id: string;
  selection_date: string;
  human_number: number;
  display_name: string | null;
  country_code: string | null;
  city: string | null;
  photo_path: string | null;
  is_removed: boolean;
};

export type ArchiveHumanRow = ArchiveEntryRow & {
  portrait_id: string | null;
  published_at: string | null;
  /** See TodaysHumanRow.founding. Null once the account is gone. */
  founding: boolean | null;
};

export type AnniversaryRow = Omit<ArchiveEntryRow, 'city'> & {
  years_ago: number;
};

export type ReportTarget = 'portrait' | 'question' | 'profile';

export type ReportReason =
  | 'harassment'
  | 'hate'
  | 'sexual'
  | 'violence'
  | 'impersonation'
  | 'spam'
  | 'other';

export type ModerationDecision = 'approved' | 'rejected';

export type PortraitQueueRow = {
  portrait_id: string;
  draw_id: string;
  selection_date: string;
  display_name: string;
  country_code: string;
  photo_path: string | null;
  submitted_at: string | null;
  verification_level: VerificationLevel;
  open_reports: number;
};

export type QuestionQueueRow = {
  question_id: string;
  draw_id: string;
  body: string;
  created_at: string;
  /** Layer 2 structural signals, comma separated. Null when nothing tripped. */
  auto_flags: string | null;
};

export type ReportQueueRow = {
  report_id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: ReportReason;
  note: string | null;
  created_at: string;
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
      /** Newest first. There is no ordering argument, and nothing to sort by. */
      get_archive: {
        Args: {
          filter_country?: string | null;
          filter_year?: number | null;
          page_limit?: number;
          page_offset?: number;
        };
        Returns: ArchiveEntryRow[];
      };
      get_human: {
        Args: { target_draw: string };
        Returns: ArchiveHumanRow[];
      };
      get_random_human: {
        Args: { filter_country?: string | null };
        Returns: ArchiveEntryRow[];
      };
      get_anniversaries: {
        Args: Record<PropertyKey, never>;
        Returns: AnniversaryRow[];
      };
      get_archive_countries: {
        Args: Record<PropertyKey, never>;
        Returns: { country_code: string; humans: number }[];
      };
      get_archive_years: {
        Args: Record<PropertyKey, never>;
        Returns: { year: number; humans: number }[];
      };
      is_moderator: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      report_content: {
        Args: {
          report_target_type: ReportTarget;
          report_target_id: string;
          report_reason: ReportReason;
          report_note?: string | null;
        };
        Returns: string;
      };
      block_user: {
        Args: { target_user: string };
        Returns: boolean;
      };
      unblock_user: {
        Args: { target_user: string };
        Returns: boolean;
      };
      /** Everything we hold about the caller, as one document (Article 8.2). */
      export_my_data: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      review_portrait: {
        Args: {
          target_portrait: string;
          decision: ModerationDecision;
          review_reason?: string | null;
        };
        Returns: boolean;
      };
      review_question: {
        Args: {
          target_question: string;
          decision: ModerationDecision;
          review_reason?: string | null;
        };
        Returns: boolean;
      };
      resolve_report: {
        Args: {
          target_report: string;
          actioned: boolean;
          resolution_note?: string | null;
        };
        Returns: boolean;
      };
      set_account_status: {
        Args: {
          target_user: string;
          new_status: AccountStatus;
          status_reason?: string | null;
        };
        Returns: boolean;
      };
      moderation_portrait_queue: {
        Args: Record<PropertyKey, never>;
        Returns: PortraitQueueRow[];
      };
      moderation_question_queue: {
        Args: Record<PropertyKey, never>;
        Returns: QuestionQueueRow[];
      };
      moderation_report_queue: {
        Args: Record<PropertyKey, never>;
        Returns: ReportQueueRow[];
      };
      register_push_token: {
        Args: { push_token: string; device_platform: 'ios' | 'android' };
        Returns: boolean;
      };
      unregister_push_token: {
        Args: { push_token: string };
        Returns: boolean;
      };
      set_notification_settings: {
        Args: {
          daily: boolean;
          selected: boolean;
          answered: boolean;
          anniversary: boolean;
        };
        Returns: boolean;
      };
      get_notification_settings: {
        Args: Record<PropertyKey, never>;
        Returns: {
          daily: boolean;
          selected: boolean;
          answered: boolean;
          anniversary: boolean;
        }[];
      };
      /** Added alongside the original, never in place of it (Article 9.6). */
      get_portrait_translations: {
        Args: { target_draw: string; target_locale: string };
        Returns: {
          element_key: PortraitElementKeyEnum;
          translated_text: string;
        }[];
      };
      /**
       * Write-only for clients. No policy lets anybody read
       * `analytics_events` from a client role, ever.
       */
      track_events: {
        Args: { batch_install_id: string; batch: Json };
        Returns: number;
      };
      /** Activation, curiosity, engagement, memory, sharing. Moderators only. */
      analytics_kpis_guarded: {
        Args: { window_days?: number };
        Returns: { metric: string; value: number; detail: string }[];
      };
      /**
       * Article 12 — the pool, its countries and its languages. Public,
       * including guests: "one in a thousand" is not checkable by somebody who
       * cannot see how many are waiting.
       */
      selection_stats: {
        Args: Record<never, never>;
        Returns: {
          waiting: number;
          countries: number;
          languages: number;
          humans_published: number;
          archive_countries: number;
        }[];
      };
      /** Countries with at least five people waiting. Smaller ones are counted, never named. */
      country_representation: {
        Args: Record<never, never>;
        Returns: { country_code: string; waiting: number }[];
      };
      /** The remainder, so the named countries plus this equals `waiting`. */
      unnamed_countries: {
        Args: Record<never, never>;
        Returns: { countries: number; waiting: number }[];
      };
      /**
       * Pool share against Archive share, per country. A monitor: the draw
       * takes eligibility and chance and nothing else (Article 5.2), and
       * tests/scale-schema.test.ts fails the build if it ever learns this.
       */
      country_balance: {
        Args: Record<never, never>;
        Returns: {
          country_code: string;
          waiting: number;
          pool_share: number;
          published: number;
          archive_share: number;
          drift: number;
        }[];
      };
      /** Weak, honest fraud signals from data already kept. Moderators only. */
      integrity_signals: {
        Args: { window_days?: number };
        Returns: { signal: string; count: number; detail: string }[];
      };
      /** Queue ages rather than queue sizes. Moderators only. */
      moderation_health: {
        Args: Record<never, never>;
        Returns: { measure: string; value: number; detail: string }[];
      };
      /** What the nightly jobs did. Moderators only. */
      job_history: {
        Args: { limit_rows?: number };
        Returns: {
          job: string;
          ran_at: string;
          ok: boolean;
          detail: string | null;
        }[];
      };
      /** Last day of Year Zero. Null until the first cycle is published. */
      year_zero_ends: {
        Args: Record<never, never>;
        Returns: string | null;
      };
      /** Whether you joined during Year Zero. Yours only, never anybody else's. */
      am_i_founding: {
        Args: Record<never, never>;
        Returns: boolean | null;
      };
      /**
       * D1 and D7 by join-day cohort. Percentages are null while a cohort is
       * too young to have reached that day — never zero. Moderators only.
       */
      retention_cohorts: {
        Args: { window_days?: number };
        Returns: {
          cohort_date: string;
          installs: number;
          returned_d1: number;
          d1_percent: number | null;
          returned_d7: number;
          d7_percent: number | null;
        }[];
      };
      /** Participants against watchers. Moderators only. */
      participation_mix: {
        Args: { window_days?: number };
        Returns: { segment: string; installs: number; percent: number }[];
      };
      /**
       * The four pre-committed thresholds that gate paid growth. Moderators
       * only. See docs/BETA.md.
       */
      growth_gate: {
        Args: { window_days?: number };
        Returns: {
          check_name: string;
          actual: number;
          threshold: number;
          passed: boolean;
        }[];
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
