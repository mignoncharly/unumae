/**
 * Generated from the fresh local database by npm run db:types:local.
 * Do not edit by hand. The narrower app contract remains in types.ts.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      abuse_rate_limits: {
        Row: {
          key_hash: string;
          request_count: number;
          scope: string;
          window_started_at: string;
        };
        Insert: {
          key_hash: string;
          request_count?: number;
          scope: string;
          window_started_at: string;
        };
        Update: {
          key_hash?: string;
          request_count?: number;
          scope?: string;
          window_started_at?: string;
        };
        Relationships: [];
      };
      account_device_attestations: {
        Row: {
          assertion_counter: number;
          attested_at: string;
          device_flag_id: string;
          id: string;
          key_id_hash: string;
          last_verified_at: string;
          platform: Database['public']['Enums']['attestation_platform'];
          public_key: string | null;
          state: Database['public']['Enums']['attestation_state'];
          user_id: string;
        };
        Insert: {
          assertion_counter?: number;
          attested_at?: string;
          device_flag_id: string;
          id?: string;
          key_id_hash: string;
          last_verified_at?: string;
          platform: Database['public']['Enums']['attestation_platform'];
          public_key?: string | null;
          state?: Database['public']['Enums']['attestation_state'];
          user_id: string;
        };
        Update: {
          assertion_counter?: number;
          attested_at?: string;
          device_flag_id?: string;
          id?: string;
          key_id_hash?: string;
          last_verified_at?: string;
          platform?: Database['public']['Enums']['attestation_platform'];
          public_key?: string | null;
          state?: Database['public']['Enums']['attestation_state'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_device_attestations_device_flag_id_fkey';
            columns: ['device_flag_id'];
            isOneToOne: false;
            referencedRelation: 'device_binding_flags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_device_attestations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      account_email_addresses: {
        Row: {
          confirmed_at: string | null;
          normalized_email: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          confirmed_at?: string | null;
          normalized_email: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          confirmed_at?: string | null;
          normalized_email?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_email_addresses_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      account_enforcement_jobs: {
        Row: {
          attempt_count: number;
          available_at: string;
          completed_at: string | null;
          created_at: string;
          id: string;
          idempotency_key: string;
          last_error_code: string | null;
          locked_at: string | null;
          status_version: number;
          target_status: Database['public']['Enums']['account_status'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempt_count?: number;
          available_at?: string;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          idempotency_key: string;
          last_error_code?: string | null;
          locked_at?: string | null;
          status_version: number;
          target_status: Database['public']['Enums']['account_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempt_count?: number;
          available_at?: string;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          idempotency_key?: string;
          last_error_code?: string | null;
          locked_at?: string | null;
          status_version?: number;
          target_status?: Database['public']['Enums']['account_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_enforcement_jobs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      account_flag_reviews: {
        Row: {
          created_at: string;
          decision: Database['public']['Enums']['account_flag_review_decision'];
          flag_id: string;
          id: string;
          note: string | null;
          reviewer_id: string | null;
        };
        Insert: {
          created_at?: string;
          decision: Database['public']['Enums']['account_flag_review_decision'];
          flag_id: string;
          id?: string;
          note?: string | null;
          reviewer_id?: string | null;
        };
        Update: {
          created_at?: string;
          decision?: Database['public']['Enums']['account_flag_review_decision'];
          flag_id?: string;
          id?: string;
          note?: string | null;
          reviewer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'account_flag_reviews_flag_id_fkey';
            columns: ['flag_id'];
            isOneToOne: false;
            referencedRelation: 'account_flags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_flag_reviews_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      account_flags: {
        Row: {
          cleared_at: string | null;
          created_at: string;
          id: string;
          kind: Database['public']['Enums']['account_flag_kind'];
          note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          signal_hash: string | null;
          signal_kind: string | null;
          user_id: string;
        };
        Insert: {
          cleared_at?: string | null;
          created_at?: string;
          id?: string;
          kind: Database['public']['Enums']['account_flag_kind'];
          note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          signal_hash?: string | null;
          signal_kind?: string | null;
          user_id: string;
        };
        Update: {
          cleared_at?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['account_flag_kind'];
          note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          signal_hash?: string | null;
          signal_kind?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_flags_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_flags_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      account_network_signals: {
        Row: {
          asn: number | null;
          id: string;
          network_class: string | null;
          network_hash: string;
          observed_at: string;
          user_id: string;
        };
        Insert: {
          asn?: number | null;
          id?: string;
          network_class?: string | null;
          network_hash: string;
          observed_at?: string;
          user_id: string;
        };
        Update: {
          asn?: number | null;
          id?: string;
          network_class?: string | null;
          network_hash?: string;
          observed_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_network_signals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      analytics_events: {
        Row: {
          created_at: string;
          event: Database['public']['Enums']['analytics_event'];
          id: string;
          install_id: string;
          occurred_on: string;
          properties: Json;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          event: Database['public']['Enums']['analytics_event'];
          id?: string;
          install_id: string;
          occurred_on?: string;
          properties?: Json;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          event?: Database['public']['Enums']['analytics_event'];
          id?: string;
          install_id?: string;
          occurred_on?: string;
          properties?: Json;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'analytics_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      app_settings: {
        Row: {
          key: string;
          note: string;
          updated_at: string;
          value: boolean;
        };
        Insert: {
          key: string;
          note: string;
          updated_at?: string;
          value: boolean;
        };
        Update: {
          key?: string;
          note?: string;
          updated_at?: string;
          value?: boolean;
        };
        Relationships: [];
      };
      archive_removal_requests: {
        Row: {
          created_at: string;
          draw_id: string;
          id: string;
          reason: string | null;
          requester_id: string | null;
          resolution_note: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database['public']['Enums']['archive_removal_status'];
        };
        Insert: {
          created_at?: string;
          draw_id: string;
          id?: string;
          reason?: string | null;
          requester_id?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database['public']['Enums']['archive_removal_status'];
        };
        Update: {
          created_at?: string;
          draw_id?: string;
          id?: string;
          reason?: string | null;
          requester_id?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database['public']['Enums']['archive_removal_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'archive_removal_requests_draw_id_fkey';
            columns: ['draw_id'];
            isOneToOne: false;
            referencedRelation: 'daily_draws';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'archive_removal_requests_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'archive_removal_requests_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      attestation_challenges: {
        Row: {
          challenge_hash: string;
          consumed_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          platform: Database['public']['Enums']['attestation_platform'];
          user_id: string;
        };
        Insert: {
          challenge_hash: string;
          consumed_at?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          platform: Database['public']['Enums']['attestation_platform'];
          user_id: string;
        };
        Update: {
          challenge_hash?: string;
          consumed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          platform?: Database['public']['Enums']['attestation_platform'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attestation_challenges_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      content_reports: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          reason: Database['public']['Enums']['report_reason'];
          reporter_id: string | null;
          resolution_action:
            Database['public']['Enums']['report_resolution_action'] | null;
          resolution_actions: Database['public']['Enums']['report_resolution_action'][];
          resolution_note: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database['public']['Enums']['report_status'];
          target_id: string;
          target_type: Database['public']['Enums']['report_target'];
        };
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          reason: Database['public']['Enums']['report_reason'];
          reporter_id?: string | null;
          resolution_action?:
            Database['public']['Enums']['report_resolution_action'] | null;
          resolution_actions?: Database['public']['Enums']['report_resolution_action'][];
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database['public']['Enums']['report_status'];
          target_id: string;
          target_type: Database['public']['Enums']['report_target'];
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string | null;
          reason?: Database['public']['Enums']['report_reason'];
          reporter_id?: string | null;
          resolution_action?:
            Database['public']['Enums']['report_resolution_action'] | null;
          resolution_actions?: Database['public']['Enums']['report_resolution_action'][];
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database['public']['Enums']['report_status'];
          target_id?: string;
          target_type?: Database['public']['Enums']['report_target'];
        };
        Relationships: [
          {
            foreignKeyName: 'content_reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'content_reports_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      daily_draws: {
        Row: {
          algorithm_version: string;
          backup_1: string | null;
          backup_2: string | null;
          backup_3: string | null;
          candidate_count: number;
          candidate_pool_hash: string;
          created_at: string;
          draw_version: number;
          entropy_commitment: string | null;
          human_number: number | null;
          id: string;
          precommitted_at: string | null;
          published_at: string | null;
          random_seed: string;
          randomness_source: string;
          redacted_at: string | null;
          redacted_by: string | null;
          redaction_reason: string | null;
          selected_user_id: string | null;
          selection_date: string;
          selection_status: Database['public']['Enums']['selection_status'];
        };
        Insert: {
          algorithm_version?: string;
          backup_1?: string | null;
          backup_2?: string | null;
          backup_3?: string | null;
          candidate_count: number;
          candidate_pool_hash: string;
          created_at?: string;
          draw_version?: number;
          entropy_commitment?: string | null;
          human_number?: number | null;
          id?: string;
          precommitted_at?: string | null;
          published_at?: string | null;
          random_seed: string;
          randomness_source?: string;
          redacted_at?: string | null;
          redacted_by?: string | null;
          redaction_reason?: string | null;
          selected_user_id?: string | null;
          selection_date: string;
          selection_status?: Database['public']['Enums']['selection_status'];
        };
        Update: {
          algorithm_version?: string;
          backup_1?: string | null;
          backup_2?: string | null;
          backup_3?: string | null;
          candidate_count?: number;
          candidate_pool_hash?: string;
          created_at?: string;
          draw_version?: number;
          entropy_commitment?: string | null;
          human_number?: number | null;
          id?: string;
          precommitted_at?: string | null;
          published_at?: string | null;
          random_seed?: string;
          randomness_source?: string;
          redacted_at?: string | null;
          redacted_by?: string | null;
          redaction_reason?: string | null;
          selected_user_id?: string | null;
          selection_date?: string;
          selection_status?: Database['public']['Enums']['selection_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'daily_draws_backup_1_fkey';
            columns: ['backup_1'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_draws_backup_2_fkey';
            columns: ['backup_2'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_draws_backup_3_fkey';
            columns: ['backup_3'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_draws_redacted_by_fkey';
            columns: ['redacted_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_draws_selected_user_id_fkey';
            columns: ['selected_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      deletion_requests: {
        Row: {
          attempt_count: number;
          available_at: string;
          avatar_objects_deleted: number;
          completed_at: string | null;
          correlation_id: string;
          current_stage: Database['public']['Enums']['deletion_request_state'];
          id: string;
          idempotency_key_hash: string;
          last_error_code: string | null;
          locked_at: string | null;
          portrait_objects_deleted: number;
          requested_at: string;
          resume_stage:
            Database['public']['Enums']['deletion_request_state'] | null;
          updated_at: string;
          user_id: string | null;
          was_published: boolean;
        };
        Insert: {
          attempt_count?: number;
          available_at?: string;
          avatar_objects_deleted?: number;
          completed_at?: string | null;
          correlation_id?: string;
          current_stage?: Database['public']['Enums']['deletion_request_state'];
          id?: string;
          idempotency_key_hash: string;
          last_error_code?: string | null;
          locked_at?: string | null;
          portrait_objects_deleted?: number;
          requested_at?: string;
          resume_stage?:
            Database['public']['Enums']['deletion_request_state'] | null;
          updated_at?: string;
          user_id?: string | null;
          was_published?: boolean;
        };
        Update: {
          attempt_count?: number;
          available_at?: string;
          avatar_objects_deleted?: number;
          completed_at?: string | null;
          correlation_id?: string;
          current_stage?: Database['public']['Enums']['deletion_request_state'];
          id?: string;
          idempotency_key_hash?: string;
          last_error_code?: string | null;
          locked_at?: string | null;
          portrait_objects_deleted?: number;
          requested_at?: string;
          resume_stage?:
            Database['public']['Enums']['deletion_request_state'] | null;
          updated_at?: string;
          user_id?: string | null;
          was_published?: boolean;
        };
        Relationships: [];
      };
      device_binding_flags: {
        Row: {
          bound_account_id: string | null;
          first_seen_at: string;
          id: string;
          last_seen_at: string;
          opaque_binding_hash: string;
          platform: Database['public']['Enums']['attestation_platform'];
          pool_bound_at: string | null;
        };
        Insert: {
          bound_account_id?: string | null;
          first_seen_at?: string;
          id?: string;
          last_seen_at?: string;
          opaque_binding_hash: string;
          platform: Database['public']['Enums']['attestation_platform'];
          pool_bound_at?: string | null;
        };
        Update: {
          bound_account_id?: string | null;
          first_seen_at?: string;
          id?: string;
          last_seen_at?: string;
          opaque_binding_hash?: string;
          platform?: Database['public']['Enums']['attestation_platform'];
          pool_bound_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'device_binding_flags_bound_account_id_fkey';
            columns: ['bound_account_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      disposable_email_domains: {
        Row: {
          domain: string;
          refreshed_at: string;
          source: string;
        };
        Insert: {
          domain: string;
          refreshed_at?: string;
          source?: string;
        };
        Update: {
          domain?: string;
          refreshed_at?: string;
          source?: string;
        };
        Relationships: [];
      };
      draw_candidates: {
        Row: {
          draw_id: string;
          user_id: string;
        };
        Insert: {
          draw_id: string;
          user_id: string;
        };
        Update: {
          draw_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'draw_candidates_draw_id_fkey';
            columns: ['draw_id'];
            isOneToOne: false;
            referencedRelation: 'daily_draws';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'draw_candidates_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      draw_invitations: {
        Row: {
          acceptance_deadline: string;
          created_at: string;
          draw_id: string;
          id: string;
          notified_at: string;
          opened_at: string | null;
          opened_source: string | null;
          position: number;
          responded_at: string | null;
          response: Database['public']['Enums']['invitation_response'] | null;
          user_id: string;
        };
        Insert: {
          acceptance_deadline: string;
          created_at?: string;
          draw_id: string;
          id?: string;
          notified_at?: string;
          opened_at?: string | null;
          opened_source?: string | null;
          position: number;
          responded_at?: string | null;
          response?: Database['public']['Enums']['invitation_response'] | null;
          user_id: string;
        };
        Update: {
          acceptance_deadline?: string;
          created_at?: string;
          draw_id?: string;
          id?: string;
          notified_at?: string;
          opened_at?: string | null;
          opened_source?: string | null;
          position?: number;
          responded_at?: string | null;
          response?: Database['public']['Enums']['invitation_response'] | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'draw_invitations_draw_id_fkey';
            columns: ['draw_id'];
            isOneToOne: false;
            referencedRelation: 'daily_draws';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'draw_invitations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      draw_precommit_candidates: {
        Row: {
          selection_date: string;
          user_id: string;
        };
        Insert: {
          selection_date: string;
          user_id: string;
        };
        Update: {
          selection_date?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'draw_precommit_candidates_selection_date_fkey';
            columns: ['selection_date'];
            isOneToOne: false;
            referencedRelation: 'draw_precommits';
            referencedColumns: ['selection_date'];
          },
          {
            foreignKeyName: 'draw_precommit_candidates_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      draw_precommits: {
        Row: {
          algorithm_version: string;
          candidate_count: number;
          candidate_pool_hash: string;
          committed_at: string;
          entropy_commitment: string;
          randomness_source: string;
          secret_seed: string;
          selection_date: string;
        };
        Insert: {
          algorithm_version?: string;
          candidate_count: number;
          candidate_pool_hash: string;
          committed_at?: string;
          entropy_commitment: string;
          randomness_source?: string;
          secret_seed: string;
          selection_date: string;
        };
        Update: {
          algorithm_version?: string;
          candidate_count?: number;
          candidate_pool_hash?: string;
          committed_at?: string;
          entropy_commitment?: string;
          randomness_source?: string;
          secret_seed?: string;
          selection_date?: string;
        };
        Relationships: [];
      };
      expo_push_receipts: {
        Row: {
          attempts: number;
          available_at: string;
          created_at: string;
          lease_expires_at: string | null;
          lease_token: string | null;
          max_attempts: number;
          provider_category: string | null;
          push_token: string;
          status: string;
          ticket_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          available_at?: string;
          created_at?: string;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          max_attempts?: number;
          provider_category?: string | null;
          push_token: string;
          status?: string;
          ticket_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          available_at?: string;
          created_at?: string;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          max_attempts?: number;
          provider_category?: string | null;
          push_token?: string;
          status?: string;
          ticket_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expo_push_receipts_push_token_fkey';
            columns: ['push_token'];
            isOneToOne: false;
            referencedRelation: 'push_tokens';
            referencedColumns: ['token'];
          },
          {
            foreignKeyName: 'expo_push_receipts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      founding_moderators: {
        Row: {
          added_at: string;
          email: string;
          note: string | null;
        };
        Insert: {
          added_at?: string;
          email: string;
          note?: string | null;
        };
        Update: {
          added_at?: string;
          email?: string;
          note?: string | null;
        };
        Relationships: [];
      };
      installation_sessions: {
        Row: {
          created_at: string;
          device_attestation_id: string;
          expires_at: string;
          id: string;
          last_seen_at: string;
          revoked_at: string | null;
          token_hash: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_attestation_id: string;
          expires_at: string;
          id?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
          token_hash: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_attestation_id?: string;
          expires_at?: string;
          id?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
          token_hash?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'installation_sessions_device_attestation_id_fkey';
            columns: ['device_attestation_id'];
            isOneToOne: true;
            referencedRelation: 'account_device_attestations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'installation_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      job_runs: {
        Row: {
          attempts: number;
          completed_at: string | null;
          detail: string | null;
          id: number;
          job: string;
          lease_expires_at: string | null;
          lease_token: string | null;
          max_attempts: number;
          next_attempt_at: string;
          ok: boolean;
          provider_category: string | null;
          ran_at: string;
          request_id: number | null;
          status: string;
        };
        Insert: {
          attempts?: number;
          completed_at?: string | null;
          detail?: string | null;
          id?: never;
          job: string;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          max_attempts?: number;
          next_attempt_at?: string;
          ok: boolean;
          provider_category?: string | null;
          ran_at?: string;
          request_id?: number | null;
          status?: string;
        };
        Update: {
          attempts?: number;
          completed_at?: string | null;
          detail?: string | null;
          id?: never;
          job?: string;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          max_attempts?: number;
          next_attempt_at?: string;
          ok?: boolean;
          provider_category?: string | null;
          ran_at?: string;
          request_id?: number | null;
          status?: string;
        };
        Relationships: [];
      };
      moderation_appeals: {
        Row: {
          appellant_id: string | null;
          created_at: string;
          id: string;
          original_event_id: string;
          original_moderator_id: string | null;
          resolution_note: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          statement: string;
          status: Database['public']['Enums']['appeal_status'];
        };
        Insert: {
          appellant_id?: string | null;
          created_at?: string;
          id?: string;
          original_event_id: string;
          original_moderator_id?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          statement: string;
          status?: Database['public']['Enums']['appeal_status'];
        };
        Update: {
          appellant_id?: string | null;
          created_at?: string;
          id?: string;
          original_event_id?: string;
          original_moderator_id?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          statement?: string;
          status?: Database['public']['Enums']['appeal_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'moderation_appeals_appellant_id_fkey';
            columns: ['appellant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderation_appeals_original_event_id_fkey';
            columns: ['original_event_id'];
            isOneToOne: false;
            referencedRelation: 'moderation_events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderation_appeals_original_moderator_id_fkey';
            columns: ['original_moderator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderation_appeals_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      moderation_decisions: {
        Row: {
          decided_at: string;
          decided_by: string | null;
          decision: Database['public']['Enums']['moderation_decision'];
          reason: string | null;
          target_id: string;
          target_type: Database['public']['Enums']['report_target'];
        };
        Insert: {
          decided_at?: string;
          decided_by?: string | null;
          decision: Database['public']['Enums']['moderation_decision'];
          reason?: string | null;
          target_id: string;
          target_type: Database['public']['Enums']['report_target'];
        };
        Update: {
          decided_at?: string;
          decided_by?: string | null;
          decision?: Database['public']['Enums']['moderation_decision'];
          reason?: string | null;
          target_id?: string;
          target_type?: Database['public']['Enums']['report_target'];
        };
        Relationships: [
          {
            foreignKeyName: 'moderation_decisions_decided_by_fkey';
            columns: ['decided_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      moderation_events: {
        Row: {
          action: Database['public']['Enums']['moderation_action'];
          actor_id: string | null;
          created_at: string;
          id: string;
          reason: string | null;
          subject_id: string | null;
          target_id: string | null;
          target_type: Database['public']['Enums']['report_target'] | null;
        };
        Insert: {
          action: Database['public']['Enums']['moderation_action'];
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          reason?: string | null;
          subject_id?: string | null;
          target_id?: string | null;
          target_type?: Database['public']['Enums']['report_target'] | null;
        };
        Update: {
          action?: Database['public']['Enums']['moderation_action'];
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          reason?: string | null;
          subject_id?: string | null;
          target_id?: string | null;
          target_type?: Database['public']['Enums']['report_target'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'moderation_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderation_events_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      moderators: {
        Row: {
          added_at: string;
          note: string | null;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          note?: string | null;
          user_id: string;
        };
        Update: {
          added_at?: string;
          note?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'moderators_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_deliveries: {
        Row: {
          attempted_at: string;
          category: Database['public']['Enums']['notification_category'];
          channel: Database['public']['Enums']['notification_channel'];
          dedupe_key: string;
          destination_hash: string;
          error_code: string | null;
          id: number;
          provider_id: string | null;
          status: Database['public']['Enums']['delivery_status'];
          user_id: string;
        };
        Insert: {
          attempted_at?: string;
          category: Database['public']['Enums']['notification_category'];
          channel: Database['public']['Enums']['notification_channel'];
          dedupe_key: string;
          destination_hash: string;
          error_code?: string | null;
          id?: never;
          provider_id?: string | null;
          status: Database['public']['Enums']['delivery_status'];
          user_id: string;
        };
        Update: {
          attempted_at?: string;
          category?: Database['public']['Enums']['notification_category'];
          channel?: Database['public']['Enums']['notification_channel'];
          dedupe_key?: string;
          destination_hash?: string;
          error_code?: string | null;
          id?: never;
          provider_id?: string | null;
          status?: Database['public']['Enums']['delivery_status'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_deliveries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_log: {
        Row: {
          category: Database['public']['Enums']['notification_category'];
          dedupe_key: string;
          id: string;
          sent_at: string;
          user_id: string;
        };
        Insert: {
          category: Database['public']['Enums']['notification_category'];
          dedupe_key: string;
          id?: string;
          sent_at?: string;
          user_id: string;
        };
        Update: {
          category?: Database['public']['Enums']['notification_category'];
          dedupe_key?: string;
          id?: string;
          sent_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_settings: {
        Row: {
          anniversary: boolean;
          answered: boolean;
          daily: boolean;
          selected: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          anniversary?: boolean;
          answered?: boolean;
          daily?: boolean;
          selected?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          anniversary?: boolean;
          answered?: boolean;
          daily?: boolean;
          selected?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      operational_alerts: {
        Row: {
          code: string;
          detected_at: string;
          draw_id: string | null;
          entity_key: string | null;
          id: number;
          job_run_id: number | null;
          message: string;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: string;
        };
        Insert: {
          code: string;
          detected_at?: string;
          draw_id?: string | null;
          entity_key?: string | null;
          id?: never;
          job_run_id?: number | null;
          message: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity: string;
        };
        Update: {
          code?: string;
          detected_at?: string;
          draw_id?: string | null;
          entity_key?: string | null;
          id?: never;
          job_run_id?: number | null;
          message?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'operational_alerts_draw_id_fkey';
            columns: ['draw_id'];
            isOneToOne: false;
            referencedRelation: 'daily_draws';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'operational_alerts_job_run_id_fkey';
            columns: ['job_run_id'];
            isOneToOne: false;
            referencedRelation: 'job_runs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'operational_alerts_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'moderators';
            referencedColumns: ['user_id'];
          },
        ];
      };
      portrait_element_revisions: {
        Row: {
          element_key: Database['public']['Enums']['portrait_element_key'];
          portrait_id: string;
          revision: number;
        };
        Insert: {
          element_key: Database['public']['Enums']['portrait_element_key'];
          portrait_id: string;
          revision?: number;
        };
        Update: {
          element_key?: Database['public']['Enums']['portrait_element_key'];
          portrait_id?: string;
          revision?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'portrait_element_revisions_portrait_id_fkey';
            columns: ['portrait_id'];
            isOneToOne: false;
            referencedRelation: 'portraits';
            referencedColumns: ['id'];
          },
        ];
      };
      portrait_element_translations: {
        Row: {
          element_key: Database['public']['Enums']['portrait_element_key'];
          engine: string;
          locale: string;
          portrait_id: string;
          translated_at: string;
          translated_text: string;
        };
        Insert: {
          element_key: Database['public']['Enums']['portrait_element_key'];
          engine: string;
          locale: string;
          portrait_id: string;
          translated_at?: string;
          translated_text: string;
        };
        Update: {
          element_key?: Database['public']['Enums']['portrait_element_key'];
          engine?: string;
          locale?: string;
          portrait_id?: string;
          translated_at?: string;
          translated_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portrait_element_translations_portrait_id_element_key_fkey';
            columns: ['portrait_id', 'element_key'];
            isOneToOne: false;
            referencedRelation: 'portrait_elements';
            referencedColumns: ['portrait_id', 'element_key'];
          },
        ];
      };
      portrait_elements: {
        Row: {
          answer: string;
          element_key: Database['public']['Enums']['portrait_element_key'];
          portrait_id: string;
          updated_at: string;
        };
        Insert: {
          answer: string;
          element_key: Database['public']['Enums']['portrait_element_key'];
          portrait_id: string;
          updated_at?: string;
        };
        Update: {
          answer?: string;
          element_key?: Database['public']['Enums']['portrait_element_key'];
          portrait_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portrait_elements_portrait_id_fkey';
            columns: ['portrait_id'];
            isOneToOne: false;
            referencedRelation: 'portraits';
            referencedColumns: ['id'];
          },
        ];
      };
      portraits: {
        Row: {
          created_at: string;
          draw_id: string;
          id: string;
          media_path: string | null;
          photo_path: string | null;
          reviewed_at: string | null;
          status: Database['public']['Enums']['portrait_status'];
          submitted_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          draw_id: string;
          id?: string;
          media_path?: string | null;
          photo_path?: string | null;
          reviewed_at?: string | null;
          status?: Database['public']['Enums']['portrait_status'];
          submitted_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          draw_id?: string;
          id?: string;
          media_path?: string | null;
          photo_path?: string | null;
          reviewed_at?: string | null;
          status?: Database['public']['Enums']['portrait_status'];
          submitted_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portraits_draw_id_fkey';
            columns: ['draw_id'];
            isOneToOne: false;
            referencedRelation: 'daily_draws';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'portraits_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          accepted_rules_at: string | null;
          account_status: Database['public']['Enums']['account_status'];
          account_status_version: number;
          activity_requirement_met: boolean;
          assurance_level: Database['public']['Enums']['assurance_level'];
          avatar_path: string | null;
          bio_short: string | null;
          birth_year: number;
          city: string | null;
          city_hidden: boolean;
          country_code: string;
          created_at: string;
          display_name: string;
          id: string;
          languages: string[];
          locale: string;
          review_pending: boolean;
          selection_eligible: boolean;
          updated_at: string;
          username: string;
          verification_level: Database['public']['Enums']['verification_level'];
          wants_selection: boolean;
        };
        Insert: {
          accepted_rules_at?: string | null;
          account_status?: Database['public']['Enums']['account_status'];
          account_status_version?: number;
          activity_requirement_met?: boolean;
          assurance_level?: Database['public']['Enums']['assurance_level'];
          avatar_path?: string | null;
          bio_short?: string | null;
          birth_year: number;
          city?: string | null;
          city_hidden?: boolean;
          country_code: string;
          created_at?: string;
          display_name: string;
          id: string;
          languages?: string[];
          locale?: string;
          review_pending?: boolean;
          selection_eligible?: boolean;
          updated_at?: string;
          username: string;
          verification_level?: Database['public']['Enums']['verification_level'];
          wants_selection?: boolean;
        };
        Update: {
          accepted_rules_at?: string | null;
          account_status?: Database['public']['Enums']['account_status'];
          account_status_version?: number;
          activity_requirement_met?: boolean;
          assurance_level?: Database['public']['Enums']['assurance_level'];
          avatar_path?: string | null;
          bio_short?: string | null;
          birth_year?: number;
          city?: string | null;
          city_hidden?: boolean;
          country_code?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          languages?: string[];
          locale?: string;
          review_pending?: boolean;
          selection_eligible?: boolean;
          updated_at?: string;
          username?: string;
          verification_level?: Database['public']['Enums']['verification_level'];
          wants_selection?: boolean;
        };
        Relationships: [];
      };
      provider_bindings: {
        Row: {
          bound_at: string;
          provider: string;
          provider_id: string;
          user_id: string;
        };
        Insert: {
          bound_at?: string;
          provider: string;
          provider_id: string;
          user_id: string;
        };
        Update: {
          bound_at?: string;
          provider?: string;
          provider_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'provider_bindings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      push_tokens: {
        Row: {
          created_at: string;
          installation_session_id: string | null;
          last_seen_at: string;
          platform: Database['public']['Enums']['push_platform'];
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          installation_session_id?: string | null;
          last_seen_at?: string;
          platform: Database['public']['Enums']['push_platform'];
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          installation_session_id?: string | null;
          last_seen_at?: string;
          platform?: Database['public']['Enums']['push_platform'];
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_installation_session_id_fkey';
            columns: ['installation_session_id'];
            isOneToOne: false;
            referencedRelation: 'installation_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      question_translations: {
        Row: {
          engine: string;
          field: Database['public']['Enums']['question_translation_field'];
          locale: string;
          question_id: string;
          translated_at: string;
          translated_text: string;
        };
        Insert: {
          engine: string;
          field: Database['public']['Enums']['question_translation_field'];
          locale: string;
          question_id: string;
          translated_at?: string;
          translated_text: string;
        };
        Update: {
          engine?: string;
          field?: Database['public']['Enums']['question_translation_field'];
          locale?: string;
          question_id?: string;
          translated_at?: string;
          translated_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'question_translations_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
        ];
      };
      question_votes: {
        Row: {
          created_at: string;
          question_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          question_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          question_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'question_votes_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'question_votes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      questions: {
        Row: {
          answer: string | null;
          answered_at: string | null;
          author_id: string;
          body: string;
          created_at: string;
          draw_id: string;
          id: string;
          status: Database['public']['Enums']['question_status'];
        };
        Insert: {
          answer?: string | null;
          answered_at?: string | null;
          author_id: string;
          body: string;
          created_at?: string;
          draw_id: string;
          id?: string;
          status?: Database['public']['Enums']['question_status'];
        };
        Update: {
          answer?: string | null;
          answered_at?: string | null;
          author_id?: string;
          body?: string;
          created_at?: string;
          draw_id?: string;
          id?: string;
          status?: Database['public']['Enums']['question_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'questions_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'questions_draw_id_fkey';
            columns: ['draw_id'];
            isOneToOne: false;
            referencedRelation: 'daily_draws';
            referencedColumns: ['id'];
          },
        ];
      };
      remembers: {
        Row: {
          created_at: string;
          draw_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          draw_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          draw_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'remembers_draw_id_fkey';
            columns: ['draw_id'];
            isOneToOne: false;
            referencedRelation: 'daily_draws';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'remembers_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      resource_quota_status: {
        Row: {
          database_limit_bytes: number | null;
          egress_limit_bytes: number | null;
          egress_used_bytes: number | null;
          id: boolean;
          sampled_at: string;
          storage_limit_bytes: number | null;
          storage_used_bytes: number | null;
        };
        Insert: {
          database_limit_bytes?: number | null;
          egress_limit_bytes?: number | null;
          egress_used_bytes?: number | null;
          id?: boolean;
          sampled_at?: string;
          storage_limit_bytes?: number | null;
          storage_used_bytes?: number | null;
        };
        Update: {
          database_limit_bytes?: number | null;
          egress_limit_bytes?: number | null;
          egress_used_bytes?: number | null;
          id?: boolean;
          sampled_at?: string;
          storage_limit_bytes?: number | null;
          storage_used_bytes?: number | null;
        };
        Relationships: [];
      };
      scheduler_status: {
        Row: {
          checked_at: string;
          detail: string;
          id: boolean;
          installed: boolean;
        };
        Insert: {
          checked_at?: string;
          detail: string;
          id?: boolean;
          installed: boolean;
        };
        Update: {
          checked_at?: string;
          detail?: string;
          id?: boolean;
          installed?: boolean;
        };
        Relationships: [];
      };
      storage_cleanup_jobs: {
        Row: {
          attempt_count: number;
          available_at: string;
          bucket_id: string;
          created_at: string;
          id: string;
          last_error_code: string | null;
          locked_at: string | null;
          manual_review_at: string | null;
          object_name: string;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          available_at?: string;
          bucket_id: string;
          created_at?: string;
          id?: string;
          last_error_code?: string | null;
          locked_at?: string | null;
          manual_review_at?: string | null;
          object_name: string;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          available_at?: string;
          bucket_id?: string;
          created_at?: string;
          id?: string;
          last_error_code?: string | null;
          locked_at?: string | null;
          manual_review_at?: string | null;
          object_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      translation_failures: {
        Row: {
          attempts: number;
          first_failed_at: string;
          last_failed_at: string;
          provider_category: string;
          status: string;
          target_field: string;
          target_id: string;
          target_kind: string;
          target_locale: string;
        };
        Insert: {
          attempts?: number;
          first_failed_at?: string;
          last_failed_at?: string;
          provider_category: string;
          status?: string;
          target_field: string;
          target_id: string;
          target_kind: string;
          target_locale: string;
        };
        Update: {
          attempts?: number;
          first_failed_at?: string;
          last_failed_at?: string;
          provider_category?: string;
          status?: string;
          target_field?: string;
          target_id?: string;
          target_kind?: string;
          target_locale?: string;
        };
        Relationships: [];
      };
      user_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
          id: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_community_rules: { Args: never; Returns: string };
      accept_community_rules_phase0: { Args: never; Returns: string };
      accept_selection: { Args: never; Returns: boolean };
      accept_selection_phase0: { Args: never; Returns: boolean };
      account_assurance_review_queue: {
        Args: never;
        Returns: {
          display_name: string;
          flag_id: string;
          flagged_at: string;
          review_context: string;
          review_due_at: string;
          signal_kind: string;
          user_id: string;
        }[];
      };
      account_deletion_is_open: { Args: never; Returns: boolean };
      advance_account_deletion: {
        Args: {
          deleted_avatars?: number;
          deleted_portraits?: number;
          expected_stage: Database['public']['Enums']['deletion_request_state'];
          next_stage: Database['public']['Enums']['deletion_request_state'];
          target_request: string;
        };
        Returns: boolean;
      };
      am_i_founding: { Args: never; Returns: boolean };
      analytics_journey_funnels: {
        Args: { window_days?: number };
        Returns: {
          actors: number;
          conversion_percent: number;
          events: number;
          journey: string;
          stage: string;
          stage_order: number;
        }[];
      };
      analytics_kpis: {
        Args: { window_days?: number };
        Returns: {
          detail: string;
          metric: string;
          value: number;
        }[];
      };
      analytics_kpis_guarded: {
        Args: { window_days?: number };
        Returns: {
          detail: string;
          metric: string;
          value: number;
        }[];
      };
      analytics_notification_attribution: {
        Args: { window_days?: number };
        Returns: {
          action: string;
          category: string;
          destination: string;
          opens: number;
          source: string;
        }[];
      };
      answer_question: {
        Args: { answer_body: string; target_question: string };
        Returns: boolean;
      };
      answer_question_phase0: {
        Args: { answer_body: string; target_question: string };
        Returns: boolean;
      };
      appeal_review_capacity: {
        Args: never;
        Returns: {
          moderator_count: number;
          pending_appeals: number;
          unreviewable_appeals: number;
        }[];
      };
      approve_portrait: { Args: { target_portrait: string }; Returns: boolean };
      ask_question: {
        Args: { question_body: string; target_draw: string };
        Returns: string;
      };
      ask_question_phase0: {
        Args: { question_body: string; target_draw: string };
        Returns: string;
      };
      assert_account_active: { Args: never; Returns: undefined };
      assert_authenticated: { Args: never; Returns: undefined };
      assign_human_number: { Args: { target_draw: string }; Returns: number };
      authorize_installation_request: {
        Args: {
          maximum_requests: number;
          target_scope: string;
          target_session_hash: string;
          target_user: string;
          window_seconds: number;
        };
        Returns: boolean;
      };
      bind_verified_device_to_pool: {
        Args: { target_binding_hash: string; target_user: string };
        Returns: boolean;
      };
      block_content_author: {
        Args: {
          target_id: string;
          target_type: Database['public']['Enums']['report_target'];
        };
        Returns: boolean;
      };
      block_content_author_phase0: {
        Args: {
          target_id: string;
          target_type: Database['public']['Enums']['report_target'];
        };
        Returns: boolean;
      };
      block_user: { Args: { target_user: string }; Returns: boolean };
      can_bind_device_to_pool: {
        Args: { target_user: string };
        Returns: boolean;
      };
      can_insert_owned_storage_object: {
        Args: {
          object_metadata: Json;
          object_name: string;
          target_bucket: string;
        };
        Returns: boolean;
      };
      can_submit_appeal: { Args: never; Returns: boolean };
      claim_account_deletion_requests: {
        Args: { limit_rows?: number };
        Returns: {
          correlation_id: string;
          request_id: string;
          stage: Database['public']['Enums']['deletion_request_state'];
          user_id: string;
        }[];
      };
      claim_account_enforcement_jobs: {
        Args: { limit_rows?: number };
        Returns: {
          job_id: string;
          status_version: number;
          target_status: Database['public']['Enums']['account_status'];
          user_id: string;
        }[];
      };
      claim_expo_push_receipts: {
        Args: { batch_size?: number };
        Returns: {
          lease_token: string;
          push_token: string;
          ticket_id: string;
        }[];
      };
      claim_storage_cleanup_jobs: {
        Args: { limit_rows?: number };
        Returns: {
          bucket_id: string;
          job_id: string;
          object_name: string;
        }[];
      };
      claim_worker_run: {
        Args: {
          presented_lease?: string;
          target_job: string;
          target_run: number;
        };
        Returns: string;
      };
      close_unfilled_cycle: {
        Args: { close_reason: string; target_draw: string };
        Returns: boolean;
      };
      complete_account_deletion: {
        Args: { target_request: string };
        Returns: boolean;
      };
      complete_account_enforcement_job: {
        Args: { target_job: string };
        Returns: boolean;
      };
      complete_expo_push_receipt: {
        Args: {
          delivered: boolean;
          permanent_failure: boolean;
          result_provider_category: string;
          target_lease: string;
          target_ticket: string;
        };
        Returns: boolean;
      };
      complete_job_run: {
        Args: { result_detail: string; succeeded: boolean; target_run: number };
        Returns: boolean;
      };
      complete_storage_cleanup_job: {
        Args: { target_job: string };
        Returns: boolean;
      };
      complete_worker_run: {
        Args: {
          result_detail: string;
          result_provider_category?: string;
          retryable: boolean;
          succeeded: boolean;
          target_lease: string;
          target_run: number;
        };
        Returns: boolean;
      };
      configure_job_secret: {
        Args: { secret_name: string; secret_value: string };
        Returns: undefined;
      };
      consume_abuse_rate_limit: {
        Args: {
          maximum_requests: number;
          target_key_hash: string;
          target_scope: string;
          window_seconds: number;
        };
        Returns: boolean;
      };
      consume_attestation_challenge: {
        Args: {
          target_challenge: string;
          target_hash: string;
          target_user: string;
        };
        Returns: boolean;
      };
      country_balance: {
        Args: never;
        Returns: {
          archive_share: number;
          country_code: string;
          drift: number;
          pool_share: number;
          published: number;
          waiting: number;
        }[];
      };
      country_representation: {
        Args: never;
        Returns: {
          country_code: string;
          waiting: number;
        }[];
      };
      create_attestation_challenge: {
        Args: {
          target_expires_at: string;
          target_hash: string;
          target_platform: Database['public']['Enums']['attestation_platform'];
          target_user: string;
        };
        Returns: string;
      };
      create_attested_installation_session: {
        Args: {
          target_attestation: string;
          target_expires_at: string;
          target_token_hash: string;
          target_user: string;
        };
        Returns: string;
      };
      current_account_status: {
        Args: never;
        Returns: Database['public']['Enums']['account_status'];
      };
      decline_selection: { Args: never; Returns: boolean };
      decline_selection_phase0: { Args: never; Returns: boolean };
      delete_account_database_records: {
        Args: { target_request: string };
        Returns: boolean;
      };
      disable_push_token: { Args: { failed_token: string }; Returns: boolean };
      do_i_remember: { Args: { target_draw: string }; Returns: boolean };
      draw_order: { Args: { ids: string[]; seed: string }; Returns: string[] };
      draw_rank: { Args: { candidate: string; seed: string }; Returns: string };
      enforce_quiet_day_cutoff: { Args: never; Returns: number };
      enqueue_expo_push_receipt: {
        Args: {
          target_ticket: string;
          target_token: string;
          target_user: string;
        };
        Returns: boolean;
      };
      enqueue_orphan_storage_objects: {
        Args: { limit_rows?: number };
        Returns: number;
      };
      escalate_draw: { Args: { target_date: string }; Returns: string };
      expire_invitations_job: { Args: never; Returns: number };
      expire_stale_invitations: { Args: never; Returns: number };
      export_my_data: { Args: never; Returns: Json };
      export_my_data_phase2: { Args: never; Returns: Json };
      export_my_data_phase5: { Args: never; Returns: Json };
      fail_account_deletion: {
        Args: { error_code: string; target_request: string };
        Returns: boolean;
      };
      fail_account_enforcement_job: {
        Args: { error_code: string; target_job: string };
        Returns: boolean;
      };
      fail_storage_cleanup_job: {
        Args: { error_code: string; target_job: string };
        Returns: boolean;
      };
      forget_human: { Args: { target_draw: string }; Returns: boolean };
      forget_human_phase0: { Args: { target_draw: string }; Returns: boolean };
      get_anniversaries: {
        Args: never;
        Returns: {
          country_code: string;
          display_name: string;
          draw_id: string;
          human_number: number;
          is_removed: boolean;
          photo_path: string;
          selection_date: string;
          years_ago: number;
        }[];
      };
      get_archive: {
        Args: {
          filter_country?: string;
          filter_year?: number;
          page_limit?: number;
          page_offset?: number;
        };
        Returns: {
          city: string;
          country_code: string;
          display_name: string;
          draw_id: string;
          human_number: number;
          is_removed: boolean;
          photo_path: string;
          selection_date: string;
        }[];
      };
      get_archive_countries: {
        Args: never;
        Returns: {
          country_code: string;
          humans: number;
        }[];
      };
      get_archive_page: {
        Args: {
          before_date?: string;
          before_draw?: string;
          filter_country?: string;
          filter_year?: number;
          page_limit?: number;
        };
        Returns: {
          city: string;
          country_code: string;
          display_name: string;
          draw_id: string;
          human_number: number;
          is_removed: boolean;
          photo_path: string;
          selection_date: string;
        }[];
      };
      get_archive_years: {
        Args: never;
        Returns: {
          humans: number;
          year: number;
        }[];
      };
      get_draw_commitment: {
        Args: { target_date: string };
        Returns: {
          algorithm_version: string;
          candidate_count: number;
          candidate_pool_hash: string;
          committed_at: string;
          entropy_commitment: string;
          randomness_source: string;
          revealed_at: string;
          revealed_seed: string;
          selection_date: string;
        }[];
      };
      get_human: {
        Args: { target_draw: string };
        Returns: {
          city: string;
          country_code: string;
          display_name: string;
          draw_id: string;
          founding: boolean;
          human_number: number;
          is_removed: boolean;
          photo_path: string;
          portrait_id: string;
          published_at: string;
          selection_date: string;
        }[];
      };
      get_my_portrait_answer_revisions: {
        Args: { target_portrait: string };
        Returns: {
          element_key: Database['public']['Enums']['portrait_element_key'];
          revision: number;
        }[];
      };
      get_notification_settings: {
        Args: never;
        Returns: {
          anniversary: boolean;
          answered: boolean;
          daily: boolean;
          selected: boolean;
        }[];
      };
      get_portrait_elements: {
        Args: { target_draw: string };
        Returns: {
          answer: string;
          element_key: Database['public']['Enums']['portrait_element_key'];
        }[];
      };
      get_portrait_translations: {
        Args: { target_draw: string; target_locale: string };
        Returns: {
          element_key: Database['public']['Enums']['portrait_element_key'];
          translated_text: string;
        }[];
      };
      get_question_translations: {
        Args: { target_draw: string; target_locale: string };
        Returns: {
          question_id: string;
          translated_answer: string;
          translated_body: string;
        }[];
      };
      get_questions: {
        Args: { target_draw: string };
        Returns: {
          answer: string;
          answered_at: string;
          body: string;
          has_voted: boolean;
          id: string;
          votes: number;
        }[];
      };
      get_random_human: {
        Args: { filter_country?: string };
        Returns: {
          city: string;
          country_code: string;
          display_name: string;
          draw_id: string;
          human_number: number;
          is_removed: boolean;
          photo_path: string;
          selection_date: string;
        }[];
      };
      get_remembered_humans: {
        Args: {
          before_draw?: string;
          before_remembered_at?: string;
          page_limit?: number;
        };
        Returns: {
          city: string;
          country_code: string;
          display_name: string;
          draw_id: string;
          human_number: number;
          is_removed: boolean;
          photo_path: string;
          remembered_at: string;
          selection_date: string;
        }[];
      };
      get_todays_human: {
        Args: never;
        Returns: {
          city: string;
          country_code: string;
          display_name: string;
          draw_id: string;
          founding: boolean;
          human_number: number;
          is_removed: boolean;
          photo_path: string;
          portrait_id: string;
          published_at: string;
          selection_date: string;
        }[];
      };
      get_yesterdays_human: {
        Args: never;
        Returns: {
          city: string;
          country_code: string;
          display_name: string;
          draw_id: string;
          human_number: number;
          is_removed: boolean;
          photo_path: string;
          selection_date: string;
        }[];
      };
      grant_moderator: { Args: { target_email: string }; Returns: boolean };
      growth_gate: {
        Args: { window_days?: number };
        Returns: {
          actual: number;
          check_name: string;
          passed: boolean;
          threshold: number;
        }[];
      };
      has_been_selected: { Args: never; Returns: boolean };
      has_device_pool_assurance: {
        Args: { target_user: string };
        Returns: boolean;
      };
      has_minimum_activity: { Args: { target_user: string }; Returns: boolean };
      has_recent_authentication: {
        Args: { maximum_age?: string };
        Returns: boolean;
      };
      ingest_analytics_events: {
        Args: {
          batch: Json;
          marketing_only?: boolean;
          target_network_hash: string;
          target_session_hash: string;
        };
        Returns: number;
      };
      integrity_signals: {
        Args: { window_days?: number };
        Returns: {
          count: number;
          detail: string;
          signal: string;
        }[];
      };
      invoke_function: { Args: { function_name: string }; Returns: number };
      invoke_notifications_if_due: { Args: never; Returns: number };
      is_eligible: { Args: { candidate_id: string }; Returns: boolean };
      is_moderator: { Args: never; Returns: boolean };
      is_published_portrait_object: {
        Args: { object_name: string };
        Returns: boolean;
      };
      job_history: {
        Args: { limit_rows?: number };
        Returns: {
          detail: string;
          job: string;
          job_status: string;
          ok: boolean;
          ran_at: string;
        }[];
      };
      joined_in_year_zero: { Args: { joined: string }; Returns: boolean };
      mark_invitation_opened: {
        Args: { open_source: string; target_invitation: string };
        Returns: boolean;
      };
      mark_invitation_opened_phase0: {
        Args: { open_source: string; target_invitation: string };
        Returns: boolean;
      };
      moderation_appeal_queue: {
        Args: never;
        Returns: {
          action: Database['public']['Enums']['moderation_action'];
          appeal_id: string;
          appellant_display_name: string;
          created_at: string;
          original_reason: string;
          statement: string;
          target_id: string;
          target_type: Database['public']['Enums']['report_target'];
        }[];
      };
      moderation_archive_removal_queue: {
        Args: never;
        Returns: {
          created_at: string;
          display_name: string;
          draw_id: string;
          human_number: number;
          portrait_id: string;
          reason: string;
          request_id: string;
          selection_date: string;
        }[];
      };
      moderation_health: {
        Args: never;
        Returns: {
          detail: string;
          measure: string;
          value: number;
        }[];
      };
      moderation_portrait_queue: {
        Args: never;
        Returns: {
          country_code: string;
          display_name: string;
          draw_id: string;
          media_path: string;
          open_reports: number;
          photo_path: string;
          portrait_id: string;
          responses: Json;
          selection_date: string;
          submitted_at: string;
          verification_level: Database['public']['Enums']['verification_level'];
        }[];
      };
      moderation_question_queue: {
        Args: never;
        Returns: {
          author_display_name: string;
          auto_flags: string;
          body: string;
          created_at: string;
          draw_id: string;
          human_number: number;
          question_id: string;
        }[];
      };
      moderation_report_queue: {
        Args: never;
        Returns: {
          created_at: string;
          note: string;
          reason: Database['public']['Enums']['report_reason'];
          report_id: string;
          subject_account_status: Database['public']['Enums']['account_status'];
          subject_display_name: string;
          target_content: string;
          target_id: string;
          target_photo_path: string;
          target_type: Database['public']['Enums']['report_target'];
        }[];
      };
      my_appealable_decisions: {
        Args: never;
        Returns: {
          action: Database['public']['Enums']['moderation_action'];
          appeal_statement: string;
          appeal_status: Database['public']['Enums']['appeal_status'];
          decided_at: string;
          event_id: string;
          reason: string;
          resolution_note: string;
          target_type: Database['public']['Enums']['report_target'];
        }[];
      };
      my_archive_removal_options: {
        Args: never;
        Returns: {
          draw_id: string;
          human_number: number;
          is_removed: boolean;
          request_status: Database['public']['Enums']['archive_removal_status'];
          requested_at: string;
          selection_date: string;
        }[];
      };
      my_blocked_users: {
        Args: never;
        Returns: {
          avatar_path: string;
          block_id: string;
          blocked_at: string;
          country_code: string;
          display_name: string;
        }[];
      };
      my_deletion_request: {
        Args: never;
        Returns: {
          completed_at: string;
          correlation_id: string;
          requested_at: string;
          state: Database['public']['Enums']['deletion_request_state'];
          was_published: boolean;
        }[];
      };
      my_human_journey: {
        Args: never;
        Returns: {
          acceptance_deadline: string;
          draw_id: string;
          human_number: number;
          invitation_id: string;
          invitation_response: Database['public']['Enums']['invitation_response'];
          notified_at: string;
          portrait_id: string;
          portrait_reviewed_at: string;
          portrait_status: Database['public']['Enums']['portrait_status'];
          portrait_submitted_at: string;
          selection_date: string;
          selection_status: Database['public']['Enums']['selection_status'];
        }[];
      };
      my_pending_invitation: {
        Args: never;
        Returns: {
          acceptance_deadline: string;
          invitation_id: string;
          notified_at: string;
          selection_date: string;
          selection_status: Database['public']['Enums']['selection_status'];
        }[];
      };
      normalize_assurance_email: {
        Args: { raw_email: string };
        Returns: string;
      };
      notifications_due: {
        Args: never;
        Returns: {
          category: Database['public']['Enums']['notification_category'];
          dedupe_key: string;
          email: string;
          locale: string;
          route_data: Json;
          subject_name: string;
          tokens: string[];
          user_id: string;
        }[];
      };
      notify_selected_candidate: {
        Args: { target_date: string };
        Returns: string;
      };
      notify_selected_candidate_job: { Args: never; Returns: string };
      operational_alerts: {
        Args: never;
        Returns: {
          alert_id: number;
          code: string;
          detected_at: string;
          draw_id: string;
          job_run_id: number;
          message: string;
          severity: string;
        }[];
      };
      participation_mix: {
        Args: { window_days?: number };
        Returns: {
          installs: number;
          percent: number;
          segment: string;
        }[];
      };
      patch_notification_setting: {
        Args: { setting_name: string; setting_value: boolean };
        Returns: boolean;
      };
      pending_question_translations: {
        Args: { batch_size?: number };
        Returns: {
          field: Database['public']['Enums']['question_translation_field'];
          original_text: string;
          question_id: string;
          target_locale: string;
        }[];
      };
      pending_translations: {
        Args: { batch_size?: number };
        Returns: {
          element_key: Database['public']['Enums']['portrait_element_key'];
          original_text: string;
          portrait_id: string;
          target_locale: string;
        }[];
      };
      pool_hash: { Args: { ids: string[] }; Returns: string };
      precommit_daily_draw: { Args: { target_date: string }; Returns: string };
      precommit_daily_draw_job: { Args: never; Returns: string };
      publish_due_cycles: { Args: never; Returns: number };
      publish_due_cycles_job: { Args: never; Returns: number };
      purge_old_analytics: { Args: never; Returns: number };
      purge_phase6_operational_data: { Args: never; Returns: Json };
      quiet_day_cutoff: { Args: { target_date: string }; Returns: string };
      raise_account_signal: {
        Args: {
          target_hash: string;
          target_note: string;
          target_signal: string;
          target_user: string;
        };
        Returns: string;
      };
      recompute_account_assurance: {
        Args: { target_user: string };
        Returns: Database['public']['Enums']['assurance_level'];
      };
      record_account_network_signal: {
        Args: {
          target_asn?: number;
          target_class?: string;
          target_network_hash: string;
          target_user: string;
        };
        Returns: boolean;
      };
      record_notification_delivery: {
        Args: {
          delivery_channel: Database['public']['Enums']['notification_channel'];
          delivery_succeeded: boolean;
          failure_code?: string;
          key: string;
          provider_reference?: string;
          sent_category: Database['public']['Enums']['notification_category'];
          target_hash: string;
          target_user: string;
        };
        Returns: boolean;
      };
      record_notification_sent: {
        Args: {
          key: string;
          sent_category: Database['public']['Enums']['notification_category'];
          target_user: string;
        };
        Returns: boolean;
      };
      record_question_translation: {
        Args: {
          target_field: Database['public']['Enums']['question_translation_field'];
          target_locale: string;
          target_question: string;
          text_value: string;
          translation_engine: string;
        };
        Returns: boolean;
      };
      record_resource_quota_status: {
        Args: {
          database_limit_bytes: number;
          egress_limit_bytes: number;
          egress_used_bytes: number;
          storage_limit_bytes: number;
          storage_used_bytes: number;
        };
        Returns: boolean;
      };
      record_same_language: {
        Args: {
          target_element: Database['public']['Enums']['portrait_element_key'];
          target_locale: string;
          target_portrait: string;
        };
        Returns: boolean;
      };
      record_same_question_language: {
        Args: {
          target_field: Database['public']['Enums']['question_translation_field'];
          target_locale: string;
          target_question: string;
        };
        Returns: boolean;
      };
      record_translation: {
        Args: {
          target_element: Database['public']['Enums']['portrait_element_key'];
          target_locale: string;
          target_portrait: string;
          text_value: string;
          translation_engine: string;
        };
        Returns: boolean;
      };
      record_translation_attempt: {
        Args: {
          provider_category?: string;
          succeeded: boolean;
          target_field: string;
          target_id: string;
          target_kind: string;
          target_locale: string;
        };
        Returns: string;
      };
      recover_selected_draw: {
        Args: {
          recovery_reason: string;
          target_draw: string;
          unavailable_user: string;
        };
        Returns: boolean;
      };
      recover_worker_runs: { Args: never; Returns: number };
      redact_portrait: {
        Args: { removal_reason?: string; target_portrait: string };
        Returns: boolean;
      };
      redraw_remaining_candidates: {
        Args: { target_date: string };
        Returns: string;
      };
      refresh_operational_alerts: { Args: never; Returns: number };
      refresh_operational_alerts_phase6: { Args: never; Returns: number };
      refresh_operational_alerts_phase7: { Args: never; Returns: number };
      refresh_selection_eligibility: { Args: never; Returns: number };
      register_push_token:
        | {
            Args: {
              device_platform: Database['public']['Enums']['push_platform'];
              push_token: string;
            };
            Returns: boolean;
          }
        | {
            Args: {
              device_platform: Database['public']['Enums']['push_platform'];
              installation_token: string;
              push_token: string;
            };
            Returns: boolean;
          };
      register_push_token_phase0: {
        Args: {
          device_platform: Database['public']['Enums']['push_platform'];
          push_token: string;
        };
        Returns: boolean;
      };
      register_validated_portrait_photo: {
        Args: {
          object_name: string;
          object_size: number;
          target_portrait: string;
          target_user: string;
        };
        Returns: string;
      };
      register_verified_device_attestation: {
        Args: {
          provider_reports_bound?: boolean;
          target_binding_hash: string;
          target_key_hash: string;
          target_platform: Database['public']['Enums']['attestation_platform'];
          target_public_key?: string;
          target_user: string;
        };
        Returns: string;
      };
      remember_human: { Args: { target_draw: string }; Returns: boolean };
      remember_human_phase0: {
        Args: { target_draw: string };
        Returns: boolean;
      };
      remove_question: {
        Args: { removal_reason?: string; target_question: string };
        Returns: boolean;
      };
      replace_disposable_email_domains: {
        Args: { domains: string[]; source_name: string };
        Returns: number;
      };
      report_content: {
        Args: {
          report_note?: string;
          report_reason: Database['public']['Enums']['report_reason'];
          report_target_id: string;
          report_target_type: Database['public']['Enums']['report_target'];
        };
        Returns: string;
      };
      report_content_phase0: {
        Args: {
          report_note?: string;
          report_reason: Database['public']['Enums']['report_reason'];
          report_target_id: string;
          report_target_type: Database['public']['Enums']['report_target'];
        };
        Returns: string;
      };
      request_account_deletion: {
        Args: { idempotency_key: string };
        Returns: {
          correlation_id: string;
          request_id: string;
          requested_at: string;
          state: Database['public']['Enums']['deletion_request_state'];
          was_published: boolean;
        }[];
      };
      request_archive_removal: {
        Args: { request_reason?: string; target_draw: string };
        Returns: string;
      };
      request_archive_removal_phase0: {
        Args: { request_reason?: string; target_draw: string };
        Returns: string;
      };
      request_attestation_review: { Args: never; Returns: string };
      resolve_operational_alert: {
        Args: { target_alert: number };
        Returns: boolean;
      };
      resolve_report: {
        Args: {
          resolution: Database['public']['Enums']['report_resolution_action'];
          resolution_note?: string;
          target_report: string;
        };
        Returns: boolean;
      };
      resolve_report_v2: {
        Args: {
          actions: Database['public']['Enums']['report_resolution_action'][];
          resolution_note?: string;
          target_report: string;
        };
        Returns: boolean;
      };
      retention_cohorts: {
        Args: { window_days?: number };
        Returns: {
          cohort_date: string;
          d1_percent: number;
          d7_percent: number;
          installs: number;
          returned_d1: number;
          returned_d7: number;
        }[];
      };
      retry_worker_runs: { Args: never; Returns: number };
      review_account_flag: {
        Args: {
          review_note?: string;
          target_decision: Database['public']['Enums']['account_flag_review_decision'];
          target_flag: string;
        };
        Returns: boolean;
      };
      review_archive_removal: {
        Args: {
          approved: boolean;
          review_note?: string;
          target_request: string;
        };
        Returns: boolean;
      };
      review_moderation_appeal: {
        Args: {
          overturned: boolean;
          review_note?: string;
          target_appeal: string;
        };
        Returns: boolean;
      };
      review_portrait: {
        Args: {
          decision: Database['public']['Enums']['moderation_decision'];
          review_reason?: string;
          target_portrait: string;
        };
        Returns: boolean;
      };
      review_question: {
        Args: {
          decision: Database['public']['Enums']['moderation_decision'];
          review_reason?: string;
          target_question: string;
        };
        Returns: boolean;
      };
      revoke_account_sessions: {
        Args: { target_status_version: number; target_user: string };
        Returns: number;
      };
      revoke_moderator: { Args: { target_email: string }; Returns: boolean };
      rewind_human_numbers: { Args: never; Returns: number };
      run_daily_draw: { Args: { target_date: string }; Returns: string };
      run_daily_draw_job: { Args: never; Returns: string };
      save_answers_and_submit_my_portrait: {
        Args: {
          expected_revisions: Json;
          submitted_answers: Json;
          target_portrait: string;
        };
        Returns: boolean;
      };
      save_my_portrait_answer: {
        Args: {
          expected_revision: number;
          target_answer: string;
          target_key: Database['public']['Enums']['portrait_element_key'];
          target_portrait: string;
        };
        Returns: number;
      };
      scheduler_installed: {
        Args: never;
        Returns: {
          checked_at: string;
          detail: string;
          installed: boolean;
        }[];
      };
      screen_text: { Args: { body: string }; Returns: string[] };
      selection_stats: {
        Args: never;
        Returns: {
          archive_countries: number;
          countries: number;
          humans_published: number;
          languages: number;
          waiting: number;
        }[];
      };
      service_role_probe: { Args: never; Returns: boolean };
      set_account_status: {
        Args: {
          new_status: Database['public']['Enums']['account_status'];
          status_reason?: string;
          target_user: string;
        };
        Returns: boolean;
      };
      set_notification_settings: {
        Args: {
          anniversary: boolean;
          answered: boolean;
          daily: boolean;
          selected: boolean;
        };
        Returns: boolean;
      };
      set_notification_settings_phase0: {
        Args: {
          anniversary: boolean;
          answered: boolean;
          daily: boolean;
          selected: boolean;
        };
        Returns: boolean;
      };
      start_my_portrait: { Args: never; Returns: string };
      start_my_portrait_phase0: { Args: never; Returns: string };
      submit_moderation_appeal: {
        Args: { appeal_statement: string; target_event: string };
        Returns: string;
      };
      submit_my_portrait: { Args: never; Returns: boolean };
      submit_my_portrait_phase0: { Args: never; Returns: boolean };
      sync_account_assurance: {
        Args: { target_user: string };
        Returns: Database['public']['Enums']['assurance_level'];
      };
      track_events: {
        Args: { batch: Json; batch_install_id: string };
        Returns: number;
      };
      track_events_phase0: {
        Args: { batch: Json; batch_install_id: string };
        Returns: number;
      };
      unblock_by_id: { Args: { target_block: string }; Returns: boolean };
      unblock_by_id_phase0: {
        Args: { target_block: string };
        Returns: boolean;
      };
      unblock_user: { Args: { target_user: string }; Returns: boolean };
      unnamed_countries: {
        Args: never;
        Returns: {
          countries: number;
          waiting: number;
        }[];
      };
      unregister_my_push_tokens: { Args: never; Returns: number };
      unregister_push_token: { Args: { push_token: string }; Returns: boolean };
      unvote_question: { Args: { target_question: string }; Returns: boolean };
      unvote_question_phase0: {
        Args: { target_question: string };
        Returns: boolean;
      };
      vote_question: { Args: { target_question: string }; Returns: boolean };
      vote_question_phase0: {
        Args: { target_question: string };
        Returns: boolean;
      };
      year_zero_ends: { Args: never; Returns: string };
    };
    Enums: {
      account_flag_kind:
        | 'suspected_duplicate'
        | 'suspected_automation'
        | 'repeated_reports'
        | 'manual_watch';
      account_flag_review_decision: 'cleared' | 'upheld';
      account_status:
        'active' | 'suspended' | 'banned' | 'deletion_pending' | 'deleted';
      analytics_event:
        | 'app_opened'
        | 'today_viewed'
        | 'portrait_completed'
        | 'archive_opened'
        | 'question_started'
        | 'question_submitted'
        | 'question_voted'
        | 'human_remembered'
        | 'signup_started'
        | 'signup_completed'
        | 'selection_accepted'
        | 'selection_declined'
        | 'notification_opened'
        | 'share_started'
        | 'share_completed'
        | 'language_changed'
        | 'active_day'
        | 'portrait_started'
        | 'portrait_submitted'
        | 'question_unvoted'
        | 'human_forgotten'
        | 'remembered_library_opened'
        | 'share_sheet_opened'
        | 'selection_explainer_opened'
        | 'mission_opened'
        | 'client_crash';
      appeal_status: 'pending' | 'upheld' | 'overturned';
      archive_removal_status: 'pending' | 'approved' | 'declined' | 'cancelled';
      assurance_level:
        | 'contact_pending'
        | 'contact_verified'
        | 'provider_verified'
        | 'device_attested'
        | 'reviewed';
      attestation_platform: 'ios' | 'android';
      attestation_state: 'verified' | 'review_required' | 'revoked';
      deletion_request_state:
        | 'requested'
        | 'account_locked'
        | 'storage_deleting'
        | 'database_deleting'
        | 'auth_deleting'
        | 'completed'
        | 'retryable_failure'
        | 'manual_review';
      delivery_status: 'accepted' | 'failed';
      invitation_response: 'accepted' | 'declined' | 'expired';
      moderation_action:
        | 'auto_flagged'
        | 'portrait_approved'
        | 'portrait_rejected'
        | 'question_approved'
        | 'question_rejected'
        | 'report_actioned'
        | 'report_dismissed'
        | 'account_suspended'
        | 'account_banned'
        | 'account_reinstated'
        | 'archive_redacted'
        | 'appeal_upheld'
        | 'appeal_overturned'
        | 'archive_removal_approved'
        | 'archive_removal_declined';
      moderation_decision: 'approved' | 'rejected';
      notification_category: 'daily' | 'selected' | 'answered' | 'anniversary';
      notification_channel: 'push' | 'email';
      portrait_element_key:
        | 'introduction'
        | 'where_im_from'
        | 'today_i_feel'
        | 'something_i_love'
        | 'something_misunderstood'
        | 'ordinary_moment'
        | 'something_id_tell_the_world';
      portrait_status:
        'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
      push_platform: 'ios' | 'android';
      question_status: 'pending' | 'approved' | 'rejected';
      question_translation_field: 'body' | 'answer';
      report_reason:
        | 'harassment'
        | 'hate'
        | 'sexual'
        | 'violence'
        | 'impersonation'
        | 'spam'
        | 'other';
      report_resolution_action:
        'dismiss' | 'remove_content' | 'suspend_account' | 'ban_account';
      report_status: 'open' | 'actioned' | 'dismissed';
      report_target: 'portrait' | 'question' | 'profile';
      selection_status:
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
      verification_level: 'none' | 'email' | 'device' | 'phone' | 'liveness';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_flag_kind: [
        'suspected_duplicate',
        'suspected_automation',
        'repeated_reports',
        'manual_watch',
      ],
      account_flag_review_decision: ['cleared', 'upheld'],
      account_status: [
        'active',
        'suspended',
        'banned',
        'deletion_pending',
        'deleted',
      ],
      analytics_event: [
        'app_opened',
        'today_viewed',
        'portrait_completed',
        'archive_opened',
        'question_started',
        'question_submitted',
        'question_voted',
        'human_remembered',
        'signup_started',
        'signup_completed',
        'selection_accepted',
        'selection_declined',
        'notification_opened',
        'share_started',
        'share_completed',
        'language_changed',
        'active_day',
        'portrait_started',
        'portrait_submitted',
        'question_unvoted',
        'human_forgotten',
        'remembered_library_opened',
        'share_sheet_opened',
        'selection_explainer_opened',
        'mission_opened',
        'client_crash',
      ],
      appeal_status: ['pending', 'upheld', 'overturned'],
      archive_removal_status: ['pending', 'approved', 'declined', 'cancelled'],
      assurance_level: [
        'contact_pending',
        'contact_verified',
        'provider_verified',
        'device_attested',
        'reviewed',
      ],
      attestation_platform: ['ios', 'android'],
      attestation_state: ['verified', 'review_required', 'revoked'],
      deletion_request_state: [
        'requested',
        'account_locked',
        'storage_deleting',
        'database_deleting',
        'auth_deleting',
        'completed',
        'retryable_failure',
        'manual_review',
      ],
      delivery_status: ['accepted', 'failed'],
      invitation_response: ['accepted', 'declined', 'expired'],
      moderation_action: [
        'auto_flagged',
        'portrait_approved',
        'portrait_rejected',
        'question_approved',
        'question_rejected',
        'report_actioned',
        'report_dismissed',
        'account_suspended',
        'account_banned',
        'account_reinstated',
        'archive_redacted',
        'appeal_upheld',
        'appeal_overturned',
        'archive_removal_approved',
        'archive_removal_declined',
      ],
      moderation_decision: ['approved', 'rejected'],
      notification_category: ['daily', 'selected', 'answered', 'anniversary'],
      notification_channel: ['push', 'email'],
      portrait_element_key: [
        'introduction',
        'where_im_from',
        'today_i_feel',
        'something_i_love',
        'something_misunderstood',
        'ordinary_moment',
        'something_id_tell_the_world',
      ],
      portrait_status: [
        'draft',
        'submitted',
        'in_review',
        'approved',
        'rejected',
      ],
      push_platform: ['ios', 'android'],
      question_status: ['pending', 'approved', 'rejected'],
      question_translation_field: ['body', 'answer'],
      report_reason: [
        'harassment',
        'hate',
        'sexual',
        'violence',
        'impersonation',
        'spam',
        'other',
      ],
      report_resolution_action: [
        'dismiss',
        'remove_content',
        'suspend_account',
        'ban_account',
      ],
      report_status: ['open', 'actioned', 'dismissed'],
      report_target: ['portrait', 'question', 'profile'],
      selection_status: [
        'scheduled',
        'selected',
        'awaiting_acceptance',
        'accepted',
        'content_review',
        'ready',
        'live',
        'completed',
        'cancelled',
        'replacement_required',
      ],
      verification_level: ['none', 'email', 'device', 'phone', 'liveness'],
    },
  },
} as const;
