# Phase 2 account deletion

Status: implemented and verified locally on 25 August 2026. Protected hosted
deployment and bounded verification are pending the gate in `OPEN_ITEMS.md`.

This phase follows Phase 2 of `implementation-roadmap-v2.md`. Account deletion
is now a durable, retryable operation. The database locks the account before any
private data is destroyed; storage, database, and Auth cleanup then run in that
order under a leased worker.

## State machine

`deletion_requests.current_stage` is one of `requested`, `account_locked`,
`storage_deleting`, `database_deleting`, `auth_deleting`, `completed`,
`retryable_failure`, or `manual_review`.

The request transaction requires a sign-in no older than 15 minutes, hashes the
idempotency key, records a non-secret support correlation ID, changes the
profile to `deletion_pending`, removes push tokens, opts the account out of the
draw, and queues session revocation. A repeat request reuses the open operation.

Workers claim rows with `FOR UPDATE SKIP LOCKED`, a five-minute lease, bounded
exponential retry, and a ten-attempt manual-review boundary. Only stable error
codes are stored. Provider responses, object names, URLs, tokens, and secrets
are not written to logs.

## Destructive order

1. Recursively list every object below the user UUID in both `avatars` and
   `portraits`, following nested folders and every page.
2. Delete in batches of 100 and re-list both prefixes. The request cannot leave
   `storage_deleting` while an object remains.
3. Delete the public profile graph. Owned rows cascade; draw, analytics, report,
   appeal, archive-removal, and moderation audit references use their documented
   anonymizing `SET NULL` behavior.
4. Delete the Supabase Auth user.
5. Mark the request completed only after the Auth row is confirmed absent, set
   `user_id` to null, and retain the anonymous operational result.

If a worker times out, the lease expires and the same stage is claimed again.
If Auth deletion succeeds but its completion write fails, retry observes that
the Auth user is already absent and safely completes the row.

## Upload and orphan controls

Portrait photographs now use
`<user>/<portrait>/photo/<version>.jpg`, never an overwrite. The app always
decodes and re-encodes the selected image as JPEG before upload. The
`register-portrait-photo` function downloads and fully decodes it again with
pixel and memory limits, then atomically registers the path and queues the old
path. A registration failure removes the new object from both server and client
cleanup paths.

Storage insert policy enforces the owner prefix, exact versioned path, JPEG MIME
and extension agreement, an 8 MiB limit, active account status, and a maximum of
10 objects per user per bucket. The scheduled `reconcile-storage` worker queues
unreferenced objects older than one hour and verifies removal. This is both an
abuse control and a Free-plan quota control.

## Retention decision

| Signal or record | Deletion behavior | Reason |
| --- | --- | --- |
| Normalized email hash | Not created or retained | Device/provider controls are preferred; an email hash remains personal data under a broad reading. |
| Provider `sub` / Auth identity | Deleted | Removed with `auth.users`. |
| Moderation audit | Retained with user references set to null | Accountability and content-safety history without an identity link. |
| Published draw | Human number, date, seed, pool hash, and count remain; identity/content references are removed | Verifiable anonymous archive tombstone. |
| Device attestation abuse flag (Phase 4) | Retain the opaque platform flag and de-identified database record | Non-identifying per-device/per-developer abuse prevention; prevents delete-and-reinstall farming. The retained record has no user ID, email, provider identifier, raw token, or network address and is disclosed before deletion and in the Phase 5 inventory. |
| Completed deletion request | Correlation ID, stage timestamps, counts, and hashed idempotency key remain; `user_id` is erased | Proves completion and supports incident review without retaining identity. |

## User experience

Settings requires recent authentication and, when needed, sends a six-digit
email code. Confirmation explains irreversibility, the anonymous Archive
tombstone, and retained non-identifying device flags. The screen displays every
stage, retry/manual-review state, and a support correlation ID. It does not sign
out or claim success until the server operation completes.

## Verification evidence

- Fresh local database: all 45 migrations apply from empty.
- `supabase db lint --local --level warning`: no schema errors.
- `supabase/tests/phase2_retryable_account_deletion.sql`: 71/71 assertions.
- More than 100 nested orphan objects are discovered and queued.
- Focused recent-auth/state/routing unit tests: 3/3.
- The local end-to-end verifier removes Auth, profile, notification token, and
  107 nested/paginated private objects; only documented anonymous tombstones
  remain. The database suite separately proves that user-linked cleanup queue
  entries are erased in the profile-graph transaction.
- All four Edge endpoints bundle on local Edge Runtime 1.70.0, return CORS 200,
  and reject unauthenticated POSTs with 401.
- Both privileged workers pass their signed service-role-only PostgREST probe
  and return successful empty-queue results locally.
- The local CLI's legacy-JWT gateway currently throws an ES256/CryptoKey type
  mismatch for its own service token. The internal signed authorization path was
  therefore tested with only that emulator gateway layer disabled. Shipped code
  still requires a verified service credential, and the protected hosted probe
  must repeat the smoke through the real gateway.

## Hosted deployment order

1. Confirm a recoverable backup and capture a sanitized hosted baseline.
2. Through the protected exact-SHA workflow, deploy the migration plus
   `register-portrait-photo`, `reconcile-storage`,
   `process-account-deletions`, then the revised `delete-account`.
3. Configure the hosted scheduler secrets and confirm both new
   cron calls produce successful `job_runs`.
4. Run `npm run test:db:phase2`, the live deletion verifier, and a physical
   iPhone deletion with more than 100 nested objects. Keep destructive failure
   injection local unless a recoverable hosted test is explicitly approved.
5. Confirm the completed row is anonymized, both prefixes are empty, the Auth
   user is absent, and only documented tombstones remain.
6. Clean up test state and capture the sanitized post-deployment baseline.

Do not deploy the revised client before `register-portrait-photo`: new clients
depend on server-side upload registration. Do not deploy the revised
`delete-account` before the processor: accounts would lock correctly but wait
indefinitely for cleanup.
