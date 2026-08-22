-- ONE HUMAN — initial migration
--
-- Phase 1 establishes the migration pipeline and nothing else. Tables arrive
-- with the phase that owns them:
--   Phase 3  profiles, auth triggers
--   Phase 4  eligibility snapshot, daily_draws
--   Phase 7  questions, question_votes, remembers
--   Phase 9  content_reports, moderation_events, user_blocks, account_flags
--
-- Two rules bind every future migration in this directory, both enforced by
-- tests/schema-guard.test.ts and scripts/verify-migrations.mjs:
--
--   1. Article 7.2 forbids follower and popularity columns outright.
--   2. Every created table must enable row level security in the same
--      migration that creates it. A table without RLS is a security bug.

-- gen_random_uuid() for primary keys.
create extension if not exists "pgcrypto" with schema extensions;

-- Case-insensitive text, used for usernames and country codes from Phase 3.
create extension if not exists "citext" with schema extensions;
