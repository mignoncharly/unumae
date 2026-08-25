# Phase 3: executable database and security CI

Implemented locally on 25 August 2026 from
`docs/implementation-roadmap-v2.md`, Phase 3.

## Outcome

Every pull request and `main` push now rebuilds the backend from an empty local
Supabase stack and executes the security model rather than inspecting SQL text.
No hosted project or hosted credential is used. `.github/workflows/ci.yml` has
three independent jobs: application, website, and a backend job covering the
database, Storage, Auth, Edge runtime, and compressed daily cycle.

The manual release-candidate workflow accepts only a full commit SHA, checks out
that exact revision, queries GitHub for a successful completed `CI` run at the
same SHA, and launches the EAS Maestro workflow from that checkout. This prevents
a later or locally modified revision from inheriting another commit's evidence.

## What the backend job proves

1. `supabase start` creates a disposable Auth/Postgres/Storage/Edge environment.
2. `supabase db reset` applies every migration from an empty database.
3. Database lint and generated TypeScript schema drift checks run against the
   migrated catalog.
4. All pgTAP suites execute, including catalog-wide RLS, policy, grant, RPC,
   `SECURITY DEFINER`, and service-role assertions.
5. Anonymous, authenticated, cross-user, restricted-account, moderator, and
   service probes execute through PostgREST and Storage.
6. Provider unit tests exercise bounded timeouts and partial notification
   responses without calling real providers.
7. The complete daily-cycle simulation covers publication, moderation,
   audience actions, decline and timeout replacement, account recovery, cutoff
   Quiet Days, concurrent draw calls, an empty pool, and cleanup.
8. Black-box requests exercise all seven Edge Functions for CORS, method,
   missing/malformed JWT, user/service separation, invalid bodies, worker job
   completion, retryable deletion, and idempotency.
9. Teardown runs with `if: always()` so a failed job does not retain state.

This gate catches the roadmap's deliberate failure examples directly: a broken
cast fails migration execution or simulation; a missing grant or policy fails
the pgTAP/catalog and HTTP probes; a failed draw fails the compressed cycle.

## Privilege baseline

PostgreSQL grants `EXECUTE` on new functions to `PUBLIC` by default. Migration
`20260825110000_phase3_function_privilege_baseline.sql` revokes that inherited
access from every existing public-schema function and changes the owner default
for future functions. Client RPC access must now be granted deliberately and is
checked against the maintained anonymous allowlist.

Portrait uploads use the Storage provider's bucket-level JPEG and eight-MiB
pre-insert limits. RLS owns identity, path shape, active-account, and object-count
checks. The registration Edge Function downloads and fully decodes the object,
then atomically attaches only a validated path to the portrait.

## Local reproduction

```bash
supabase start
supabase db reset --yes
supabase db lint --local --level warning
npm run verify:db-types
supabase test db
npm run test:edge
npm run verify:integration
npm run simulate
supabase functions serve --no-verify-jwt # leave running in another terminal
npm run verify:edge
supabase stop --no-backup
```

Use `npm run db:types:local` only when an intentional migration changes the
catalog, and review the generated diff. The handwritten `types.ts` remains the
narrow app-facing contract; `database.generated.ts` is the complete drift
artifact.

## Remaining external and phase dependencies

- A repository administrator must make all three CI jobs required checks and
  protect the release branch. A committed workflow cannot enforce that setting.
- `EXPO_TOKEN` must be added as a scoped Actions secret before the manual
  release-candidate workflow can launch EAS.
- Hosted staging does not exist until Phase 10, so no staging deployment or
  exact-artifact promotion claim is made here.
- Attestation verification is introduced in roadmap Phase 4. The Edge harness
  is ready to receive replay, malformed, and expired token cases, but Phase 3
  cannot test a protocol that has not yet been selected or implemented.

These are tracked in `docs/OPEN_ITEMS.md`; none is hidden behind a green local
test result.

## Local verification evidence

The final clean-room run on 25 August 2026 produced:

- 46 migrations reapplied from empty; database lint clean; generated types in
  sync.
- 147 pgTAP assertions across the Phase 1, Phase 2, and Phase 3 suites.
- 640 application assertions across 44 Jest suites.
- 3 Edge provider unit tests and the complete seven-function black-box matrix.
- Full daily-cycle simulation including the `200`/`409` scheduler race with one
  active draw and a zero-candidate Quiet Day.
- Expo Doctor 21/21, website semantic checks clean, and 33 static pages built.
- Secret scan clean across 464 repository files; website audit has zero known
  vulnerabilities; root audit has no high/critical findings.

The root audit reports 12 moderate findings in the Expo build-tool chain through
`xcode` → `uuid`. npm offers only a forced downgrade to Expo 46 for the complete
remediation, so it is tracked for an upstream compatible update rather than
silently accepting a breaking framework replacement.
