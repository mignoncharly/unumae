/**
 * Generated database types.
 *
 * Regenerate with:
 *   npx supabase gen types typescript --local > src/lib/supabase/types.ts
 *
 * Phase 1 ships the empty shape so the client is typed from the start; tables
 * arrive in Phase 3 (auth) and Phase 4 (eligibility and the draw).
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
