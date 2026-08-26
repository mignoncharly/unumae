# Phase 10 — single-project operational readiness

Phase 10 repository controls are implemented locally. Unumae intentionally
uses one hosted Supabase project and one EAS project; staging is not part of the
architecture.

Implemented controls:

- disposable local development and ephemeral CI with no hosted credentials;
- one protected hosted deployment target with exact-SHA CI provenance checks;
- one EAS variable environment, with hosted test builds distinguished from App
  Store production builds by `APP_ENV`;
- sanitized hosted baselines before and after deployment;
- scheduler credentials migrated from `public.job_secrets` into Supabase Vault;
- daily encrypted database and Storage export outside Supabase, automatic
  retention pruning, and failure issues;
- disposable timed restore rehearsal;
- six-hour hosted keep-warm, service-health, and database-disk checks;
- incident procedures for every critical dependency.

Local verification:

```bash
npm run verify:operations
npm run verify
supabase db reset --yes
supabase test db supabase/tests/phase10_operational_readiness.sql
```

The completion gate is not claimed until the existing hosted Supabase project,
Auth, Storage, Edge Functions, cron jobs, Vault secret names, required iOS
providers, migration history, EAS linkage, and public environment variables are
audited and captured. A scheduled encrypted backup must be observed outside
Supabase and a restore workflow must record real elapsed time.
