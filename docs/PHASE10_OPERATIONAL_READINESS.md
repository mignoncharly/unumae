# Phase 10 — environment separation and operational readiness

Phase 10 repository controls are implemented locally on 26 August 2026.
External project allocation, protected-environment configuration, scheduled
backup execution, and a timed restore remain operator evidence.

Implemented controls:

- local-only development and ephemeral CI with no hosted credentials;
- staging/production EAS separation and build-time project-ref rejection;
- protected, exact-SHA, CI-provenance promotion workflow;
- scheduler credentials migrated from `public.job_secrets` into Supabase Vault;
- daily encrypted database and Storage export outside Supabase, automatic
  retention pruning, and failure issues;
- disposable timed restore rehearsal;
- six-hour staging/production keep-warm, service-health, and database-disk check;
- incident procedures for every Phase 10 critical dependency.

Local verification:

```bash
npm run verify:operations
npm run verify
supabase db reset --yes
supabase test db supabase/tests/phase10_operational_readiness.sql
```

The completion gate is not claimed until both hosted projects are distinct,
their GitHub/EAS/Edge/Auth/Storage/cron configuration is audited, backups are
observed in external storage, and a restore workflow records real elapsed time.
