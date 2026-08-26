# Phase 1 account enforcement

Implemented and verified locally on 25 August 2026. This document is the
release record for Phase 1 of `docs/implementation-roadmap-v2.md`.

## Status

- [x] Central authenticated/active account helpers exist in PostgreSQL.
- [x] Every authenticated participation RPC is active-only.
- [x] Direct profile, portrait, portrait-element, avatar, and portrait-storage
      writes are active-only through RLS.
- [x] Export, appeal, push-token removal, and account deletion remain available.
- [x] Moderation supports compound removal plus suspension/ban actions.
- [x] Report target type, target existence, and target author are derived and
      validated by the database before sanctioning.
- [x] Account-status changes create versioned, idempotent Auth outbox jobs in
      the same transaction.
- [x] The Edge worker revokes existing Auth refresh sessions and retries stable
      error codes without logging credentials or provider payloads.
- [x] A restricted client clears private caches and routes only to appeal,
      export, or account deletion.
- [x] Fresh-database migration, database lint, 56 executable pgTAP assertions,
      Edge runtime smoke tests, and client tests pass.
- [ ] Deploy through the protected exact-SHA workflow to the single hosted
      project and complete bounded synthetic verification.

## Account-state policy

| Capability | Active | Suspended | Banned | Deletion pending |
| --- | --- | --- | --- | --- |
| Read public content | Yes | Yes | Guest-equivalent client surface | Guest-equivalent client surface |
| Export own data | Yes | Yes | Yes | Yes, until deletion completes |
| Delete account | Yes | Yes | Yes | Idempotent in Phase 2 |
| Read/submit appeal | Yes | Yes | Yes | No |
| Participate, report, block, or edit | Yes | No | No | No |
| Register push token | Yes | No | No | No |
| Remove push tokens | Yes | Yes | Yes | Yes |
| Moderate | Active moderator only | No | No | No |

The database guard is immediate. Auth session revocation is defense in depth and
may lag until the one-minute worker runs. Existing access JWTs remain harmless
because prohibited writes re-check `profiles.account_status` on every call.

A permanent provider ban is deliberately not used: after the access token
expired it would also prevent the promised appeal, export, and delete paths.
The worker instead removes current `auth.sessions` rows (and their cascading
refresh tokens). A person may authenticate again, but is returned to the
restricted support surface and remains blocked by PostgreSQL.

## Database boundary

The public helpers are:

- `current_account_status()`
- `assert_authenticated()`
- `assert_account_active()`
- `can_submit_appeal()`

The original Phase 0 implementations are retained under internal `*_phase0`
names with all client execution revoked. Their public RPC names are narrow
guards that call `assert_account_active()` before delegating. This preserves the
tested behavior while making account state unavoidable.

The active-only set covers selection acceptance/decline, rules acceptance,
portrait start/edit/upload registration/submission, asking/answering/voting,
Remember/forget, reports, blocks, archive-removal requests, push registration,
notification settings, invitation-open attribution, and authenticated
analytics. Anonymous analytics remains available; authenticated analytics is
blocked for restricted accounts.

## Compound moderation

`resolve_report_v2(report, actions[], note)` accepts one or two typed actions:

- `dismiss`
- `remove_content`
- `suspend_account`
- `ban_account`
- `remove_content` plus one account sanction

Dismiss cannot be combined. Suspend and ban cannot be combined. A content ban
automatically includes removal of the reported item if the caller omitted it.
The database derives the subject from the reported question, portrait, or
profile; a mismatched target type fails before any action. Content removal,
account sanction, and report resolution each leave their own audit event.

The old single-action `resolve_report` contract is no longer executable by
`authenticated`, so it cannot bypass the compound policy.

## Auth-enforcement outbox

`set_account_status` locks the profile, ignores duplicate state, increments
`account_status_version`, removes the account from eligibility, writes the
moderation event, and inserts one `account_enforcement_jobs` row atomically.

The worker:

1. Marks older status versions `superseded`.
2. Claims the current version with `FOR UPDATE SKIP LOCKED`.
3. Revokes refresh sessions for a restricted state.
4. Completes the job, or records a bounded error code and exponential retry.
5. Reclaims five-minute stale locks and stops automatic attempts after ten.

It accepts only the exact service-role bearer credential. User JWTs are refused
even though the Edge runtime itself validates them.

## Verification evidence

```text
supabase db reset
  PASS: 44 migrations applied from an empty PostgreSQL 17 database

supabase db lint --local --level warning
  PASS: No schema errors found

npm run test:db:phase1
  PASS: 56/56 pgTAP assertions

npm test -- --runInBand \
  src/features/auth/__tests__/accountState.test.ts \
  src/features/selection/__tests__/eligibility.test.ts
  PASS: 34/34 tests

supabase functions serve enforce-account-status
  PASS: worker bundled and served on the local Edge runtime
  PASS: OPTIONS 200; unauthenticated POST 401
```

The pgTAP suite executes as active, suspended, banned, deletion-pending,
moderator, banned moderator, and service-role contexts. It calls the real RPCs,
exercises direct RLS writes, verifies compound moderation audit rows, and proves
outbox idempotency, supersession, session revocation, and completion.

## Hosted deployment order

1. Capture a sanitized hosted baseline and confirm a recoverable backup.
2. Deploy `enforce-account-status` and both Phase 1 migrations through the
   protected exact-SHA workflow.
3. Run `npm run test:db:phase1` locally and the equivalent authenticated live
   probes against the hosted project.
4. Suspend and restore a synthetic hosted user; observe the outbox, Auth
   session revocation, restricted client, appeal, export, and deletion paths.
5. Clean up the synthetic user and capture the post-deployment baseline.
6. Observe the cron invocation, job history, and outbox through at least one
   successful restriction and restoration.

Do not apply the migration without deploying the worker in the same release:
database enforcement remains safe, but Auth jobs would retry until the worker
appears.
