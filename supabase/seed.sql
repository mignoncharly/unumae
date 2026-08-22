-- Local development seed data.
--
-- Runs against the local Supabase stack only (`npx supabase db reset`).
-- Never contains real people, and never runs against staging or production.
--
-- Phase 4 seeds a synthetic candidate pool here so that the draw can be
-- exercised locally without waiting two days for a real cycle.

select 'ONE HUMAN — nothing to seed yet' as status;
