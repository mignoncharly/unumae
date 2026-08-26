# Phase 0 production baseline

> Historical snapshot: captured before the later decision to use one hosted
> Supabase project and launch iOS first. Current environment policy lives in
> `docs/ENVIRONMENTS.md`; historical Android bundle evidence below is retained.

Captured 25 August 2026. This is the reproducible starting point for
`docs/implementation-roadmap-v2.md`. It contains configuration metadata only;
secret values and user data are deliberately excluded.

## Status

Phase 0 is complete. The production database and control-plane snapshot are
current as of 25 August 2026:

- [x] The selection-group route fix is retained and verified against a clean
      Android Metro bundle.
- [x] Local and production migration histories match.
- [x] Database grants, RLS state, policies, cron, storage configuration, and
      scheduled-job secret names are captured by a repeatable read-only command.
- [x] All three deployed Edge Function endpoints answer an `OPTIONS` health
      request.
- [x] EAS production configuration, build version, and latest finished build
      are recorded.
- [x] Free-plan constraints and paid-plan blockers are written down.
- [x] Release verification and rollback procedures are defined.
- [x] Deployed function versions, Edge secret names, and hosted Auth settings
      were recaptured through an authenticated, read-only management session.
- [x] `npm run verify` (621 tests), Expo Doctor (21/21), and the website
      verification/build (33 pages) remain green.

The recapture found one production configuration gap: `RESEND_API_KEY` and
`NOTIFICATION_FROM_EMAIL` are absent from the Edge secret store. The
`send-notifications` worker therefore records `email_not_configured` instead of
sending the selected-user email fallback when push delivery does not succeed.
This is tracked in `docs/OPEN_ITEMS.md` and must be fixed before public beta.

## Source and mobile release

| Item                                          | Captured value                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Baseline source commit before Phase 0 changes | `492b5be79add8d6b3105510c98c00500ce8492d9`                                                  |
| Expo project                                  | `@mignoncharly/unumae` (`75cfb922-5d90-4436-965d-e67672558ed3`)                             |
| Bundle identifier                             | `com.unumae.app`                                                                            |
| App version                                   | `0.1.0`                                                                                     |
| Remote iOS build number                       | `3`                                                                                         |
| Latest finished production build              | `7c091b3b-5909-42bf-b2b5-76fea2dbae6c`                                                      |
| Build source                                  | `145e8b35adb71fd40c8fa5b9314a0bafb1ba57f5`                                                  |
| Build SDK / number                            | Expo SDK 57 / `0.1.0 (3)`                                                                   |
| Production EAS variables                      | `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` present; values not captured |

The source baseline is newer than the currently finished production build. A
future release must produce a new build from the exact commit that passes the
release checklist.

## Route baseline

`src/app/(selection)/_layout.tsx` is intentionally retained. On 25 August 2026
Metro was started with an empty cache and an Android bundle was requested:

- 1,378 modules bundled successfully.
- Output bundle size: 6,602,749 bytes.
- No `No route named "(selection)"` warning appeared.

Metro was stopped cleanly after the check. The generated bundle was written to
the operating-system temporary directory, not the repository.

## Production database

Run this read-only command to reproduce the sanitized snapshot:

```bash
npm run baseline:production
```

Pass `-- --full` to include the complete policy, grant, and function inventory.
The command reads the gitignored credential file, sends the password to `psql`
through its environment, and never prints a connection string or secret value.

Snapshot captured at `2026-08-25T07:55:15Z`:

| Item                          | Value                                                          |
| ----------------------------- | -------------------------------------------------------------- |
| Project                       | `qpicjsjxdblrxdrdibge`                                         |
| PostgreSQL                    | `17.6`                                                         |
| Migrations                    | 42, latest `20260823230000`; local and remote match            |
| Public tables                 | 30                                                             |
| Public tables with RLS        | 30 of 30                                                       |
| Public policies               | 13                                                             |
| Client table-grant records    | 39                                                             |
| Public functions              | 132                                                            |
| Security-definer functions    | 123                                                            |
| Client function-grant records | 239                                                            |
| Extensions                    | `citext 1.6`, `pg_cron 1.6.4`, `pg_net 0.20.4`, `pgcrypto 1.3` |
| Scheduled-job secret names    | `functions_url`, `service_role_key`                            |

The counts are drift indicators, not proof that each policy is semantically
correct. Phase 3 replaces that assumption with executable role-based tests.

## Scheduled jobs

All nine jobs were active when captured:

| Job                            | Schedule (UTC) | Command                                  |
| ------------------------------ | -------------- | ---------------------------------------- |
| `onehuman-refresh-eligibility` | `50 23 * * *`  | `refresh_selection_eligibility()`        |
| `onehuman-daily-draw`          | `0 0 * * *`    | `run_daily_draw_job()`                   |
| `onehuman-publish`             | `1 0 * * *`    | `publish_due_cycles_job()`               |
| `onehuman-notify-candidate`    | `10 0 * * *`   | `notify_selected_candidate_job()`        |
| `onehuman-expire-invitations`  | `*/5 * * * *`  | `expire_invitations_job()`               |
| `unumae-send-notifications`    | `*/5 * * * *`  | `invoke_notifications_if_due()`          |
| `unumae-operational-alerts`    | `*/5 * * * *`  | `refresh_operational_alerts()`           |
| `unumae-translate-portraits`   | `0 1 * * *`    | `invoke_function('translate-portraits')` |
| `unumae-purge-analytics`       | `30 3 * * *`   | `purge_old_analytics()`                  |

## Storage

Both production buckets are private:

| Bucket      |  Limit | MIME allowlist                             |
| ----------- | -----: | ------------------------------------------ |
| `avatars`   |  5 MiB | JPEG, PNG, WebP                            |
| `portraits` | 20 MiB | JPEG, PNG, WebP, MP4 video, MPEG/MP4 audio |

The object policies captured were:

- `storage_avatars_own` — authenticated, all operations
- `storage_portraits_own` — authenticated, all operations
- `storage_portraits_moderator_read` — authenticated, select
- `storage_portraits_published_read` — anonymous and authenticated, select

## Edge Functions and hosted Auth

The repository contains three functions. Each production endpoint returned HTTP
200 to an unauthenticated `OPTIONS` request on 25 August 2026:

| Function              | Version | Status   | Updated UTC            | Endpoint  | Remote bundle SHA-256                                             |
| --------------------- | ------: | -------- | ---------------------- | --------- | ------------------------------------------------------------------ |
| `delete-account`      |       3 | `ACTIVE` | `2026-08-24T14:32:03Z` | Reachable | `7318e41b20f0c5528f33ddd0361b16ceca37467f798b3e978807082cbb0a93ab` |
| `send-notifications`  |       3 | `ACTIVE` | `2026-08-23T03:02:38Z` | Reachable | `4b57c846e6ac7ee8a3649c40f00e82fcb669034b3510c0b644d863a1277b8b9d` |
| `translate-portraits` |       2 | `ACTIVE` | `2026-08-23T08:17:55Z` | Reachable | `3f6ad1f6e9eac7d3eb4aae3d11e0fcbc260bb06db9728dabaefe3599b9269752` |

The remote bundle digest is Supabase's deployed artifact digest. It is not
directly comparable to a hash of the unbundled local `index.ts` file. Reproduce
the version and secret-name inventory with:

```bash
supabase functions list --project-ref qpicjsjxdblrxdrdibge --output json
supabase secrets list --project-ref qpicjsjxdblrxdrdibge --output json
npm run verify:release-config
```

Only secret names and digests may enter release evidence. Values must never be
copied into this document. The captured names are:

- Platform-provided: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_JWKS`,
  `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`
- Application-provided: `DEEPL_API_KEY`
- Required by source but absent: `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`

Hosted Auth passed all six checks on 25 August 2026: production Site URL, native
redirect, web redirect, Apple provider, both code-based email templates, and
custom SMTP. The saved CLI token was passed directly from Windows Credential
Manager to the verifier in process memory and was neither printed nor persisted
by the repository.

## Current Free-plan constraints

These are architectural inputs, not temporary warnings:

| Constraint      | Current limit / behavior                                                 | Roadmap consequence                                                                    |
| --------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Active projects | Two across all organizations where the account is Owner or Administrator | Product decision uses one hosted project; development and CI remain local |
| Database        | 500 MB per project; exceeding it can make the database read-only         | Monitor size and keep retention jobs operational                                       |
| File storage    | 1 GB per organization billing-period average                             | Orphan cleanup and deletion reconciliation are mandatory                               |
| Egress          | 5 GB uncached and 5 GB cached                                            | Monitor photo traffic and signed-media delivery                                        |
| Edge Functions  | 500,000 invocations                                                      | Batch and deduplicate scheduled work                                                   |
| Logs            | One day accessible                                                       | Persist operational outcomes in application tables                                     |
| Managed backups | Not included                                                             | Self-managed encrypted logical dumps are required before real user data                |
| PITR            | Not included; paid add-on                                                | Pro is a production-traffic gate and PITR needs a separate decision                    |
| Inactivity      | Free projects may pause after about seven days of insufficient activity  | Hosted health monitoring and the paid production gate remain required                  |

Authoritative references: [billing and quotas](https://supabase.com/docs/guides/platform/billing-on-supabase),
[database size](https://supabase.com/docs/guides/platform/database-size),
[storage size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size),
[project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), and
[database backups](https://supabase.com/docs/guides/platform/backups).

## Paid-plan blockers

- Public production traffic is blocked until the production organization is on
  at least Pro, as required by the roadmap release gate.
- Managed daily backups require Pro or higher.
- PITR remains a separately priced add-on and is not unlocked by Pro alone.
- Reliable long-lived log access requires a paid plan or external log drain.
- EAS-hosted Maestro jobs are separately blocked by the Expo account plan; a
  macOS runner remains the no-subscription alternative.

## Working-tree ownership

The following pre-existing files were deliberately not folded into Phase 0:

- `docs/APP_STORE_CONNECT_PROMPT.md`
- `docs/k.jpeg`

They remain user-owned, untracked work. The v2 roadmap itself is part of Phase
0 because it is now the implementation source of truth.
