# Implementation roadmap (v2)

Revised for two hard constraints that emerged during review:

1. **No identity-document verification is available.** Human-uniqueness cannot be proven. The plan now enforces what is enforceable and changes the product claim to match, rather than implying a guarantee that does not exist.
2. **Supabase Free plan — two active projects total.** The project limit applies across every organization where you are Owner or Administrator, so a second organization does not create a third project. A separate development project is therefore not available, and managed backups / point-in-time recovery are not available at all.

## What changed from v1

| Phase | Change                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Records platform-tier constraints as an explicit input to later phases                                                                |
| 1     | Unchanged in substance; adds attestation-registration RPC to the guarded set                                                          |
| 2     | Adds anti-abuse signal retention decision; storage-quota awareness                                                                    |
| 3     | Fresh-database CI now runs on the **local ephemeral Supabase stack**, not a third project                                             |
| 4     | **Rewritten.** Biometric/ID path removed. Replaced with a provider + device + age + review ladder, and honest verification vocabulary |
| 5     | Adds anti-abuse signals and retained device flags to the inventory with documented withholding                                        |
| 6     | Installation sessions become attestation-backed rather than UUID-backed                                                               |
| 8     | Absorbs the client-side attestation work                                                                                              |
| 10    | **Rewritten.** Three environments across two projects; self-managed logical backups; Pro upgrade becomes an explicit release gate     |
| Gates | Pro-plan upgrade added as a production prerequisite                                                                                   |

Phases 1–5 remain public-beta blockers. Every phase uses forward-only migrations, executable database tests, structured logging, and a staged deployment before production.

The full database test platform lands in Phase 3, but targeted executable regression tests ship alongside every earlier fix. Do not defer testing of Phases 1 and 2 to Phase 3.

---

# Phase 0 — Stabilize the baseline

Priority: P0
Relative size: Small

Goal: Establish a reproducible starting point, and record the platform constraints that shape Phases 3, 4, and 10.

## Work

- Commit or intentionally discard the currently untracked route fix:
  - `src/app/(selection)/_layout.tsx`
- Restart Metro and confirm the `(selection)` warning is gone.
- Record the current production migration version and deployed Edge Function versions.
- Capture current privilege grants, RLS policies, cron jobs, Auth settings, storage policies, and Edge Function secrets.
- **Record current platform-tier constraints** and treat them as roadmap inputs:
  - Two active projects, shared across all organizations you administer
  - No managed backups, no PITR, one-day log retention
  - Database and file-storage quotas per project
  - Automatic pause after one week without API requests
- Create a release checklist that distinguishes:
  - Local static verification
  - Local ephemeral-database verification
  - Staging verification
  - EAS device verification
- Do not promote to public beta until Phases 1–5 are complete.

## Acceptance criteria

- Clean or intentionally documented working tree.
- Current production state can be reconstructed from captured configuration.
- Existing `npm run verify`, Expo Doctor, and website verification remain green.
- A rollback procedure exists for every subsequent phase.
- A written note of which roadmap items are blocked on a paid plan.

---

# Phase 1 — Enforce suspension and bans everywhere

Priority: P0
Relative size: Large

Goal: A suspended or banned account must be unable to perform prohibited actions, even through direct Supabase RPC calls.

## 1.1 Define the account-state policy

| Action                         | Active                   | Suspended       | Banned           | Deletion pending    |
| ------------------------------ | ------------------------ | --------------- | ---------------- | ------------------- |
| Read public content            | Yes                      | Yes             | Guest-equivalent | Guest-equivalent    |
| Export personal data           | Yes                      | Yes             | Yes              | Yes, until deletion |
| Delete account                 | Yes                      | Yes             | Yes              | Idempotent          |
| Submit appeal                  | Yes                      | Yes             | Yes              | No                  |
| Ask / vote / remember / report | Yes                      | No              | No               | No                  |
| Enter selection pool           | Yes                      | No              | No               | No                  |
| Edit profile or content        | Yes                      | No              | No               | No                  |
| Register device attestation    | Yes                      | No              | No               | No                  |
| Moderator functions            | Separate moderator check | Separate policy | No               | No                  |

Do not block export, deletion, or appeal accidentally.

## 1.2 Centralize database enforcement

Add a migration containing helpers:

- `current_account_status()`
- `assert_authenticated()`
- `assert_account_active()`
- `can_submit_appeal()`

Call `assert_account_active()` inside every relevant mutating RPC:

- Questions: ask, vote, unvote, answer
- Remembers: remember and forget
- Selection preferences and community-rule acceptance
- Portrait creation, editing, upload registration, and submission
- Reports and blocks
- Push-token registration
- Device-attestation registration (introduced in Phase 4)
- Analytics events tied to authenticated participation

The database is the security boundary. React Native route guards are not.

## 1.3 Make moderation actions compound operations

Replace mutually exclusive report actions with a request that can express:

- Remove the reported content
- Suspend or ban the author
- Apply both
- Dismiss the report

Introduce `resolve_report_v2(...)` or a structured argument rather than silently changing the existing RPC contract.

Validate that:

- The report target exists.
- The target type matches the target row.
- The reported content's author matches the account being sanctioned.
- Every action is written to the moderation audit log.

Update the admin interface to present independent checkboxes or a clearly defined compound action.

## 1.4 Decide what happens to existing content

Recommended policy:

- Removing a question hides it immediately.
- Banning for a particular report removes that reported content by default.
- Historical portraits are not all automatically erased solely because of a ban.
- Moderators can separately redact published portraits.
- Public readers must exclude explicitly removed or redacted content.
- Account status alone does not destroy historical audit records.

## 1.5 Auth-level enforcement

Database guards stop writes immediately; Auth sessions should also be disabled.

Implement an account-enforcement outbox:

1. Moderator RPC updates `profiles.account_status`.
2. The same transaction inserts an `account_enforcement_jobs` row.
3. An Edge Function applies the corresponding Supabase Auth ban or revocation.
4. The job records attempts, completion, and errors.
5. A retrying scheduled worker handles transient failures.

The database guard remains authoritative while Auth revocation is pending.

## 1.6 Client behavior

- Add a global account-status gate.
- Clear private query caches when an account becomes suspended or banned.
- Route suspended users to an appeal / export / delete screen.
- Never present a disabled UI as the only enforcement.
- Provide a clear moderator-action reason where policy permits.

## Tests

Execute against PostgreSQL, not migration source strings:

- Active user can call every normal RPC.
- Suspended and banned JWTs are rejected by every prohibited RPC.
- Suspended users can export, appeal, and delete.
- Direct RPC calls bypassing the app remain blocked.
- Ban plus removal hides content from all public readers.
- Auth enforcement jobs are idempotent and retryable.
- Moderator checks cannot be bypassed by passing another user ID.

## Completion gate

No prohibited RPC succeeds for a suspended, banned, or deletion-pending user.

---

# Phase 2 — Make account deletion complete and retryable

Priority: P0
Relative size: Large

Goal: Deletion must not leave private files behind or partially destroy an otherwise active account.

## 2.1 Introduce a deletion state machine

Add a `deletion_requests` table with states:

- `requested`
- `account_locked`
- `storage_deleting`
- `database_deleting`
- `auth_deleting`
- `completed`
- `retryable_failure`
- `manual_review`

Include: user ID, request and completion timestamps, current stage, attempt count, last error code, idempotency key, and whether a published archive record existed.

Do not store raw provider responses or secrets.

## 2.2 Lock first, delete asynchronously

1. Authenticate the caller.
2. Set account status to `deletion_pending`.
3. Disable further user mutations immediately.
4. Create or reuse the deletion request.
5. Return an accepted / in-progress response.
6. Let a privileged worker perform destructive work.
7. Retry failed stages safely.

Once deletion begins, the account no longer behaves as active. This removes the current "photos gone but account still active" failure mode.

## 2.3 Delete storage by prefix

For both avatar and portrait buckets:

- List all objects recursively under the user-owned prefix.
- Paginate until exhaustion.
- Delete in provider-safe batches.
- Check every list and remove response.
- Re-list afterward and confirm zero remaining objects.
- Handle nested folders.
- Record counts without logging object URLs or sensitive names.

Do not derive the complete deletion set only from database paths.

## 2.4 Prevent new orphaned files

Change uploads to deterministic or uniquely versioned user paths.

1. Upload the new object.
2. Atomically register the new path in the database.
3. Queue the previous path for deletion.
4. If registration fails, delete the just-uploaded object.
5. Run a scheduled orphan reconciler as defense in depth.

Enforce: expected owner prefix, MIME allowlist, size limit, extension/MIME consistency, image-decoding validation, maximum objects per user.

Note: the per-user object cap is not only an abuse control on the free tier — it is a quota control. Orphaned files consume the same storage allowance as live ones, so the reconciler is load-bearing, not optional.

## 2.5 Database and Auth cleanup

- Preserve only the documented anonymized draw tombstone.
- Confirm every table referencing a user has intentional CASCADE, SET NULL, or retention behavior.
- Delete the Auth user only after storage cleanup is confirmed.
- If Auth deletion fails, retry without reactivating the account.
- Remove notification tokens early.
- Confirm scheduled jobs cannot recreate user data during deletion.

## 2.6 Anti-abuse signal retention (new)

Deletion must not become a reset button for abuse controls. Decide and document, per signal:

- **Device attestation flags** (Phase 4): retain. They contain no personal data — a per-device, per-developer flag held by the platform vendor, not linkable back to an identity. Retaining them is what prevents delete-and-reinstall farming. Disclose the behavior in the privacy policy and deletion confirmation text.
- **Normalized email hash**: decide explicitly. Retaining a one-way hash prevents immediate re-registration of the same address but is personal data under a broad reading. Recommended: do not retain past deletion; rely on device and provider signals instead.
- **Provider `sub` identifiers**: delete with the account.
- **Moderation audit records**: retain in anonymized form per 1.4.

Whatever is retained must appear in the Phase 5 inventory with a stated legal or product basis.

## 2.7 User experience

- Require recent authentication before deletion.
- Explain that deletion becomes irreversible after confirmation.
- State plainly which non-identifying abuse signals persist.
- Show in-progress and completed states.
- Make repeat requests idempotent.
- Provide support correlation IDs without exposing internal errors.

## Tests

Inject failures at every stage: storage listing failure, partial pagination, storage deletion failure, database failure, Auth deletion failure, worker timeout, duplicate requests, worker retry after partial completion, more than 100 objects, nested objects, orphaned replacement photos.

## Completion gate

A deletion verification script proves no remaining Auth, profile, token, private storage, or other user-owned records, except explicitly documented anonymized tombstones and the retained non-identifying abuse signals from 2.6.

---

# Phase 3 — Execute the database and security model in CI

Priority: P0
Relative size: Large

Goal: A green build must mean the migrations and core product cycle actually work.

## 3.1 Fresh-database test environment — local, not hosted

The fresh-database requirement does **not** need a hosted project. Run the Supabase CLI's local stack inside CI:

1. Start a disposable local Supabase stack in the CI runner (Postgres, Auth, Storage, Realtime, Edge runtime, in Docker).
2. Apply every migration from an empty database.
3. Run database linting.
4. Generate or check database types.
5. Execute integration tests.
6. Tear down the stack.

This is free, unlimited, and parallelizable across pull requests. It is also strictly better than a shared hosted dev project, because runs cannot contaminate one another.

Keep static migration checks as fast supplementary checks only.

## 3.2 Required database integration suites

### Privileges and RLS

Test as: anonymous, normal authenticated user, another authenticated user, suspended user, banned user, moderator, service role.

Verify every table and RPC, including negative cases.

### Complete daily cycle

1. Eligibility refresh
2. Pool freeze
3. Draw
4. Invitation
5. Accept / decline / expire
6. Replacement selection
7. Portrait submission
8. Moderation
9. Publication
10. Questions and answers
11. Cycle completion
12. Archive reading
13. Account deletion and tombstone behavior

Include empty pools, quiet days, retries, concurrent calls, and timezone boundaries.

### Edge Functions

Test: JWT validation, service-role separation, idempotency, provider timeouts, partial provider failures, retry behavior, invalid request bodies, CORS and method enforcement, and **attestation-token verification** including replay, malformed, and expired tokens.

## 3.3 Server-side CI

Add a remote CI workflow that runs on pull requests and protected branches:

- TypeScript
- ESLint
- Formatting
- Unit / component tests
- Fresh-database migration and integration tests (local stack, per 3.1)
- Edge Function tests
- Website verification
- Dependency audit
- Secret scanning

Make these required checks before merging. Keep the pre-push hook as a convenience, not the security boundary.

## 3.4 Release gating

- Only EAS-build commits that passed required CI.
- Run Maestro smoke tests against the same commit SHA.
- Run live verification against **staging** after deployment.
- Promote the exact tested artifacts and migrations to production.

## Completion gate

A deliberately broken SQL cast, missing grant, missing RLS policy, or failed daily draw causes CI to fail.

---

# Phase 4 — Age enforcement and honest account assurance

Priority: P0 product-integrity decision
Relative size: Medium (reduced from v1 — the biometric and identity-provider path is removed)

Goal: Make eligibility claims match actual enforcement, and raise the cost of duplicate accounts to a level proportionate to the value of a draw entry.

**Framing.** Without identity documents or a trusted identity provider, human uniqueness cannot be proven. The objective is not one-person-one-account. It is: make an additional draw entry cost more than it is worth, and never claim more than you enforce.

## 4.1 Choose an age strategy

### Option A — Data-minimizing (recommended)

Store only birth year, and require the user to have been at least 16 on January 1 of the current year. This rejects some users who are already 16, but never knowingly admits a 15-year-old on the basis of year alone.

### Option B — Exact

Store full date of birth privately and calculate exact age in UTC. More correct, but increases sensitive-data responsibility, export scope, and privacy-declaration burden.

Whichever is selected:

- Enforce it in the database.
- Never trust a client-calculated eligibility flag.
- Include age data in export and deletion.
- Update privacy disclosures and App Store data declarations.
- Add boundary tests for birthdays, leap years, and New Year transitions.

## 4.2 Define the verification vocabulary

Replace "verified human" everywhere. It is not true and it is the claim most likely to cause reputational damage.

Levels, in ascending strength:

| Level               | Meaning                                                                                                | Mechanism                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `contact_verified`  | An email address exists and was confirmed                                                              | Magic link / password confirm             |
| `provider_verified` | A stable third-party account identifier is bound to this account                                       | Sign in with Apple / Google               |
| `device_attested`   | Requests originate from a genuine app on a genuine device not already bound to a pool-eligible account | DeviceCheck + App Attest / Play Integrity |
| `reviewed`          | A human moderator examined duplicate-signal flags and cleared the account                              | Manual review queue                       |

Product copy states what is verified. Nothing implies uniqueness of person.

## 4.3 The uniqueness ladder

Implement in this order. Items 1–3 and 5–6 are the beta scope; item 4 is deferred.

### 1. Restrict pool eligibility to provider-verified accounts

Email-only accounts may read, and may hold a profile, but never enter the selection pool.

Rationale: Sign in with Apple returns a `sub` identifier that is stable per Apple ID per developer team, and remains stable even when the user selects Hide My Email — the relay address rotates, the `sub` does not. Supabase persists it in `auth.identities.provider_id`. One Apple ID therefore yields exactly one account, and a second Apple ID requires distinct verification in practice.

Enforce with a unique constraint on `(provider, provider_id)` and a database-level pool-eligibility check that reads the bound identity, not a profile column.

Cost: near zero. Effect: raises the marginal cost of an extra entry from seconds to a new platform account.

### 2. Normalize and unique-index email addresses

- Lowercase.
- Strip everything from `+` to `@`.
- Strip dots in the local part for providers that ignore them.
- Reject a maintained disposable-domain list, refreshed on a schedule.
- Unique index on the normalized form.

Cost: low. Effect: closes the trivial alias vector.

### 3. Device attestation

This is the single highest-leverage control available without identity documents.

**iOS**

- **DeviceCheck** — two bits of per-device, per-developer server-side state that survive app deletion and reinstall. Use one bit as "this device has been bound to a pool-eligible account." Read and set it from an Edge Function using an Apple-issued key; never from the client.
- **App Attest** — hardware-backed proof that the request comes from your genuine, unmodified app on a genuine Apple device. This closes the "script calling the RPC directly" vector that route guards and client checks cannot.

**Android**

- **Play Integrity** — device and app integrity verdicts, plus the reinstall-persistent per-device recall mechanism as the DeviceCheck analogue. Verify verdicts server-side in an Edge Function.

Both platform mechanisms are free. Neither returns personal data; both return opaque per-device state scoped to your developer account.

Design notes:

- Attestation is verified in an Edge Function; the result is written to the database by that function under service role. The client never asserts its own attestation status.
- The device flag is set at pool entry, not at signup, so a legitimate device replacement or family device does not silently burn eligibility at install time.
- Provide a documented manual-review path for false positives — shared devices, refurbished hardware, and legitimate device transfers all exist.
- Store attestation state as an opaque flag plus timestamp. Do not store raw attestation payloads.

Cost: meaningful engineering, no per-user money. Effect: a farm of ten accounts becomes a farm of ten devices.

### 4. Phone verification — deferred, specified now

Do not implement for beta. Specify it so it can ship quickly if farming is observed.

- Gate to draw entry only, never signup, to bound SMS cost.
- Store `HMAC-SHA256(pepper, E.164)` only. Never the raw number.
- Pepper lives in the Edge secret store, never in a database table.
- Unique index on the hash.
- Screen VoIP and virtual-number ranges via a number-type lookup, or the control buys nothing.
- Adds a phone number to your personal-data inventory, export, deletion, and App Store declarations — budget for that, not just the SMS.

Trigger for implementing: observed farming, or a rise in the value of winning the draw sufficient to justify the cost.

### 5. Account age and engagement requirement

Before pool entry, require:

- A minimum account age (start at 7 days).
- Community rules accepted.
- Profile complete.
- Some minimum genuine activity.

Enforce in the database as part of the eligibility refresh. Costs nothing and converts farming from a scripting problem into a scheduling problem.

### 6. Clustering signals and manual review

Raise review flags — never irreversible automatic decisions — on:

- Same device across multiple pool-eligible accounts
- Signup bursts from one IP or ASN
- Datacenter and known-VPN ASNs
- Shared push tokens
- Correlated activity windows
- Rapidly created related accounts

Flagged accounts are excluded from the draw while unresolved and resolved by a human. Log the signal that fired and the reviewer decision.

## 4.4 Draw trust

Independent of identity, improve draw verifiability:

- Precommit the candidate-set hash before the draw.
- Use external public randomness or a commit–reveal entropy scheme.
- Publish the input hash, randomness source, algorithm version, and result.
- Keep cancelled and redrawn cycles in an append-only audit history.

This matters more now, not less: when you cannot prove uniqueness, verifiable fairness of the draw itself carries more of the trust burden.

## Tests

- Age boundary cases: birthday on the cycle date, leap-year births, New Year transition, timezone edges.
- Email normalization: dot variants, plus-tags, mixed case, disposable domains, unicode look-alikes.
- Provider binding: same Apple `sub` cannot bind to two accounts; Hide My Email rotation does not create a second identity.
- Attestation: replayed token rejected, expired token rejected, malformed token rejected, client-asserted status ignored, second account on a flagged device blocked from pool entry.
- Manual review: flagged account excluded from draw, cleared account admitted, decisions audited.
- Deletion: device flag persists, provider identifier does not.

## Completion gate

Underage boundary cases are rejected in the database. Pool entry requires a provider-verified account, an attested device not already bound to a pool-eligible account, and a minimum account age. Duplicate-signal clusters are excluded from the draw pending human review. **All product language claims account and device verification only — nothing in the product implies a verified unique human.**

---

# Phase 5 — Complete privacy export and disclosure alignment

Priority: P0 compliance / reputation
Relative size: Medium

Goal: Every piece of personal data is represented in export and retention documentation.

## 5.1 Build a personal-data inventory

For every table and storage bucket, document: subject identifier, data fields, purpose, visibility, retention period, export behavior, deletion behavior, and the legal or product reason for retention.

Include internal data:

- Account flags and verification levels
- Moderation decisions and notes
- Reports involving the user
- Draw candidate records and ranks
- Notification delivery data
- Analytics identifiers
- Operational records containing user IDs
- Translation records associated with user content
- **Anti-abuse signals from Phase 4**: attestation state, device-binding flags, clustering flags, review decisions, normalized-email hash if retained

## 5.2 Version the export

Introduce export schema version 3 containing all applicable records.

Do not expose:

- Other users' private identifiers
- Moderator personal identifiers
- Provider secrets
- Internal security signals whose disclosure would enable abuse, unless legally required — this now explicitly covers clustering thresholds and device-binding internals

Where a field is withheld, document that it is withheld and why. Do not claim the export contains "everything."

Specifically document, in user-facing language: a non-identifying device flag persists after account deletion to prevent abuse, and it contains no personal information.

## 5.3 Prepare for large exports

The current single JSON RPC will eventually become too large — and on the current storage quota, generated archives compete with user photos for the same allowance.

Target evolution:

1. Request export.
2. Generate asynchronously.
3. Store in a private bucket.
4. Issue a short-lived signed download URL.
5. Automatically delete the generated archive on a short timer.
6. Record generation time and download expiry.

For beta-scale data the current direct share can remain temporarily, provided size is bounded and enforced.

## 5.4 Align declarations

Reconcile actual fields with: iOS privacy manifest, App Store privacy labels, website privacy policy, in-app privacy text, and retention and deletion behavior.

Review specifically: city/country, birth data, moderation data, device identifiers, **attestation and anti-abuse signals**, and analytics. Device attestation is a data-collection disclosure even though the data is non-identifying — declare it.

## Tests

Create a fixture user with data in every personal-data table. Compare export keys against the maintained inventory and fail CI when a new personal-data table is added without an export and retention decision.

## Completion gate

Every personal-data source has an explicit export and deletion policy, enforced by tests, and every retained-after-deletion signal is disclosed.

---

# Phase 6 — Abuse resistance and data integrity

Priority: P1
Relative size: Medium

## Work

- Validate report targets before insertion.
- Prevent duplicate open reports from one reporter for the same target.
- Add layered limits by user, installation, and Edge/network controls.
- Validate Expo push-token format and length.
- Limit active tokens per user and device.
- Deduplicate token ownership safely.
- Move public analytics ingestion behind an Edge Function.
- **Replace client-supplied installation UUIDs with attestation-backed installation sessions** issued server-side. This is the same mechanism built in Phase 4.3 item 3 — reuse it rather than inventing a parallel identifier.
- Cap event batch size, payload size, total rate, and invalid-event ratio.
- Treat client analytics as indicative, never authoritative for security or fairness decisions.
- Add retention jobs for analytics, delivery logs, and rejected reports — these also protect the database quota.

## Completion gate

Rotating a client-provided UUID no longer bypasses controls, and invalid reports or tokens cannot fill operational queues.

---

# Phase 7 — Worker and notification reliability

Priority: P1
Relative size: Medium

## Work

- Fix the ignored `record_same_language` error.
- Introduce a shared `fetchWithTimeout`.
- Use bounded concurrency instead of fully sequential translation calls.
- Add job leases so crashed workers do not leave items permanently stuck.
- Add maximum attempts and dead-letter states.
- Record provider response categories without logging personal content.
- Make all worker operations idempotent.
- Process Expo push receipts and disable permanently invalid tokens.
- Create Android notification channels before permission and token registration.
- Add operational alerts for: repeated worker failures, stale leases, growing queue depth, provider authentication failures, notification delivery collapse.
- **Add an alert for approaching database, storage, and egress quota**, since exceeding them on the current tier degrades the product rather than generating an invoice.

## Completion gate

Every queued job eventually completes, enters a visible dead-letter state, or raises an operational alert. Nothing silently loops forever.

---

# Phase 8 — Mobile correctness, attestation client, and Android completion

Priority: P1
Relative size: Medium to large

## Work

- Replace portrait blur autosave plus separate submission with an atomic "save answers and submit" RPC.
- Make individual autosaves versioned to prevent stale writes.
- Change notification settings to patch individual fields or use optimistic concurrency.
- Surface mutation errors consistently.
- Replace substring onboarding-route checks with exact Expo Router segments.
- Show a recoverable error instead of returning null for malformed live data.
- Confirm notification-response retries and marking-open behavior.
- **Implement the client half of Phase 4.3 item 3**: App Attest key generation and assertion on iOS, Play Integrity token request on Android, attestation failure states, and a graceful path for simulators and development builds that does not weaken production enforcement.
- **Design the attestation failure UX**: a user on an unsupported or flagged device must see an explanation and a review path, not a silent exclusion from the draw.
- Complete Android-specific work: notification channels, permission flows, image picker and storage behavior, deep links, universal/app links, keyboard and safe-area layouts, back navigation, release signing.
- Add Android Maestro and device coverage if Android release remains in scope.

## Completion gate

Core journeys survive rapid taps, offline transitions, stale data, app restarts, and both supported mobile platforms. Attestation failures are explained and recoverable.

Implementation note (2026-08-26): the Phase 8 database/client/native work and
Android EAS/Maestro coverage are complete locally; see
`docs/PHASE8_MOBILE_CORRECTNESS.md`. Signed physical-device attestation,
Android workflow execution, release signing, and store-link verification remain
release evidence rather than claims made from the local checkout.

---

# Phase 9 — Website, CSP, metadata, and quality gate

Priority: P2 before broad marketing
Relative size: Medium

## Work

- Generate person-specific HTML metadata for Human pages via SSR, an edge route, or generated static snapshots.
- Include correct canonical URL, title, description, Open Graph image, and structured data.
- Add explicit fetch timeouts and retry behavior to public-data calls.
- Replace CSP `'unsafe-inline'` with hashes, nonces, or external scripts and styles.
- Diagnose the Chromium analytics navigation race.
- Make WebKit skip-link testing reflect supported keyboard behavior.
- Stabilize or isolate Firefox renderer infrastructure failures.
- Ensure Lighthouse runs even when an unrelated browser project fails, while keeping the aggregate quality gate red.
- Add the full website quality suite to CI.
- Continue dependency audits; upgrade the Expo build chain when a compatible patched path is available.
- **Ensure public page copy matches the Phase 4.2 vocabulary.** Marketing pages are the most likely place for a "verified human" claim to survive a code change.

## Completion gate

Public URLs produce useful metadata without JavaScript, CSP no longer depends on unrestricted inline execution, the complete quality suite reliably runs in CI, and no public surface overstates verification.

Implementation note (2026-08-26): published Human links now receive build-time
localized HTML snapshots, ProfilePage metadata, and person-specific raster
social cards from the anonymous publication boundary. Public reads use bounded
timeouts and retries; the Nginx CSP has no `unsafe-inline`; browser projects are
isolated and aggregated before Lighthouse; and CI runs the complete website
quality gate. See `docs/PHASE9_WEBSITE_QUALITY.md`.

---

# Phase 10 — Environment separation and operational readiness

Priority: P1 operational safety; begin planning early
Relative size: Medium (reduced — the third project is unnecessary)

Goal: Development and automated verification cannot mutate production, and a documented recovery path exists for every critical dependency, within a two-project limit.

## 10.1 Three environments across two projects

The missing environment is local, not hosted.

| Environment     | Where                                                  | Purpose                                                                                                                                                                             |
| --------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Development** | Supabase CLI local stack, in Docker, one per developer | Day-to-day development, migration authoring, seeding. No shared state — nobody can break anyone else's work.                                                                        |
| **CI**          | Ephemeral local stack inside the CI runner             | Fresh-database migration and integration tests per Phase 3.1. Created and destroyed per run.                                                                                        |
| **Staging**     | Project A                                              | Shared, production-like. Real cron jobs, staging-scoped Edge secrets, staging Resend configuration, staging push credentials, device builds pointed here. Live verification target. |
| **Production**  | Project B                                              | Production only.                                                                                                                                                                    |

Do **not** use Project A as a shared development database. That is the worst configuration available: developers mutate the same state you are supposed to be validating releases against, and staging stops meaning anything.

A second organization does not create a third project — the limit follows the administering account across organizations.

## 10.2 Credential and promotion discipline

- Distinct per environment: Auth users, storage buckets, Edge secrets, Resend configuration, push credentials where practical, cron and webhook endpoints.
- Service-role credentials never appear in a developer `.env`. They exist only in CI secrets and the Supabase secret store. Local development uses the local stack's own throwaway service key.
- Migrations promote local → CI → staging → production. No manual production SQL.
- Production Edge Function deploys happen only from CI, from a commit that passed required checks.
- Remove personal email addresses from future immutable migrations; seed moderators through controlled operational tooling.
- Rotate job secrets out of ordinary database tables into the platform secret store.
- Require MFA and least privilege for anyone with production access.

## 10.3 Backups — self-managed until the plan is upgraded

The current tier provides no managed backups, no point-in-time recovery, and one day of log retention. The v1 item "test backup restoration" is not achievable as written.

Interim, mandatory before any real user data exists:

1. Scheduled `pg_dump` of production to external storage outside Supabase, on a fixed cadence.
2. Separate scheduled export of storage-bucket objects, or an accepted, written decision that user photos are not backed up and what that means for users.
3. Encrypt dumps at rest; restrict access to production administrators.
4. Retention policy and automatic pruning for the dumps.
5. **Rehearse a restore into a local stack at least once, and document the runbook with actual elapsed time.** An untested backup is not a backup.
6. Alert when a scheduled dump fails or is skipped.

Managed daily backups and PITR require a paid plan. Treat the upgrade as a launch cost, not an optimization — see release gates below.

## 10.4 Availability on the current tier

- Free projects pause after roughly a week without API requests. Staging will pause between release cycles; keep it warm with a scheduled ping from CI, or accept the resume delay and document it in the release checklist.
- Confirm whether internal scheduled jobs alone are sufficient to keep production active. If not, add an external uptime ping so a quiet period cannot pause production.
- Monitor database size, file storage, egress, and monthly active users against quota. On this tier, exceeding them degrades service rather than generating a bill.

## 10.5 Incident procedures

Define and rehearse procedures for:

- Draw failure
- Notification failure
- Data deletion failure
- Credential exposure
- Moderator-account compromise
- **Quota exhaustion**
- **Unplanned project pause**
- **Data loss with only self-managed dumps available**

## Completion gate

Development and CI cannot reach staging or production. Staging and production have fully separate Auth, storage, secrets, and scheduled jobs. Service-role keys exist only in CI secrets and the platform secret store. Migrations promote through the documented path. A scheduled logical backup runs to external storage with a restore procedure that has actually been executed and timed. Every critical daily-cycle dependency has a documented recovery path.

Implementation note (2026-08-26): repository controls are complete locally:
hosted promotion is protected, exact-SHA, and CI-provenance checked; mobile
builds separate staging from production; scheduler credentials migrate to
Supabase Vault; encrypted database and Storage backups, pruning, failure alerts,
hosted health checks, and a timed disposable restore workflow are defined; and
critical incident runbooks exist. External staging allocation, protected secret
configuration, a successfully scheduled backup, and actual timed restore
evidence remain required before the completion gate is claimed. See
`docs/PHASE10_OPERATIONAL_READINESS.md`.

---

# Recommended release gates

### Before public beta

- Complete Phases 0–5, including executable regression tests for account enforcement and deletion.
- Phase 4 completion gate met, including the language change — this is the cheapest item on the list and the most damaging to skip.
- Phase 10.3 interim backups running and a restore rehearsed.

### Before production traffic

- **Upgrade to a paid Supabase plan.** This is a hard gate, not an optimization. It removes automatic pausing, provides managed backups and point-in-time recovery, and lifts the quotas that a photo-based product will reach first. Running production without managed backups is acceptable for a closed beta and is not acceptable once users have data they would be upset to lose.

### Before meaningful user growth

- Complete Phases 6–8.
- Environment separation from Phase 10 fully in place.
- Device attestation shipped on both platforms, with the manual-review path staffed.

### Before broad public marketing

- Complete Phase 9.
- Externally verifiable draw improvements (4.4) shipped.
- Incident drills and backup restoration tested against production-scale data.
- A written decision on whether phone verification (4.3 item 4) is required at expected scale.

# Critical path

```
Baseline
  → account enforcement
  → deletion safety
  → executable DB/CI verification (local ephemeral stack)
  → age enforcement + provider/device assurance + honest claims
  → complete privacy guarantees
  → paid plan + backups
  → abuse and worker hardening
  → attestation client + Android completion
  → web, operations, verifiable draw
```

# Open decisions requiring an explicit answer

These are not engineering tasks. They need a written decision before the phases that depend on them.

1. **Age strategy**: Option A (birth year, conservative cutoff) or Option B (full date of birth). Blocks Phase 4.1 and Phase 5.4.
2. **Email-only accounts**: read-only participation, or no account at all? Blocks Phase 4.3 item 1.
3. **Email hash retention after deletion**: retain or not. Blocks Phase 2.6 and Phase 5.1.
4. **Storage backup**: back up user photos, or state explicitly that they are not backed up. Blocks Phase 10.3.
5. **Attestation false-positive policy**: who reviews, in what time frame, and what the user sees while waiting. Blocks Phase 4.3 item 3 and Phase 8.
6. **Paid-plan timing**: which milestone triggers the upgrade. Blocks the production traffic gate.
