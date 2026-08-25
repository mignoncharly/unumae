-- Roadmap v2 Phase 1 -- account-state vocabulary.
--
-- Enum values must commit before a later migration can safely use them in
-- functions, constraints, or data. The enforcement migration therefore lives
-- in the next file.

alter type public.account_status
  add value if not exists 'deletion_pending' before 'deleted';
