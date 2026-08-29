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
- daily age-encrypted database and Storage export to GitHub Actions artifact
  storage outside Supabase, 35-day retention, and failure issues;
- disposable timed restore rehearsal with storage checksums and critical
  database/media integrity checks;
- six-hour hosted keep-warm, service-health, and database-disk checks;
- incident procedures for every critical dependency.

Local verification:

```bash
npm run verify:operations
npm run verify
supabase db reset --yes
supabase test db supabase/tests/phase10_operational_readiness.sql
```

The hosted-infrastructure portion of the completion gate was achieved on
27 August 2026. The existing Supabase project, Auth, Storage, Edge Functions,
cron jobs, Vault secret names, required iOS provider secret names, migration
history, EAS linkage, public environment variables, and sanitized baseline were
audited and captured in `docs/PHASE_B_HOSTED_BASELINE.md`.

Phase 10 is not fully complete until Phase E observes a scheduled encrypted
backup outside Supabase and a restore workflow records real elapsed time. The
interim restore workflow uses an isolated hosted PostgreSQL target and does not
use Docker; the free plan remains unsuitable for public production because it
does not provide managed backups or PITR.
