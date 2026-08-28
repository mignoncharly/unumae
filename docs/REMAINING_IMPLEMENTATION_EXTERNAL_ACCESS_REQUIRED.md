# Remaining implementation: external access required

Status: 28 August 2026

This is the owner/external-environment queue. These items cannot be completed
from repository-only work because they require credentials, keys, paid plans,
Apple/Google accounts, a physical device, hosted infrastructure, staffed
operations, real participants, legal approval, or an explicit product decision.

No secret values belong in this file, source control, logs, or chat. Use the
protected GitHub/EAS/Supabase secret stores and record only secret names,
sanitized evidence, timestamps, build IDs, and commit SHAs.

## Required sequence

| Order | Phase | External dependency | Completion evidence |
| ---: | --- | --- | --- |
| 1 | D | Physical iPhone, macOS or approved EAS build access, Apple signing/provider access | `docs/IOS_RELEASE_VERIFICATION.md` tied to an exact build and SHA |
| 2 | E | Supabase paid plan before public production, protected backup/restore secrets, and an isolated hosted restore target | Scheduled artifact backup, timed isolated restore, alert delivery, and incident-drill evidence |
| 3 | F | Legal/support owner, App Store Connect access, final signed artifact and real-device screenshots | Approved legal pages, staffed contacts, completed listing, and reviewable artifact |
| 4 | G | Alpha participants, private-beta cohort, moderator/on-call coverage and hosted production access | Alpha findings, four mature beta weeks, gate result, release record and first-cycle evidence |
| 5 | 15 | Moderator-only mature `growth_gate()` result and explicit owner authorization | Dated gate decision and aggregate experiment record |
| 6 | 16/H | Post-launch owner decision and, if approved, privacy/processor/operations review | Approved feature track and design review before implementation |

## Phase D — signed iOS and provider evidence

Required access/actions:

- Borrow or authorize a physical iPhone and complete every native,
  accessibility, offline, slow-network, media, deletion, notification,
  universal-link, and UTC-rollover check.
- Use macOS/Xcode/Maestro or an approved EAS workflow for the signed build.
  The EAS Maestro path requires the account plan described in
  `docs/IOS_RELEASE_VERIFICATION.md`; the local macOS path is the alternative.
- Use Apple Developer/App Store Connect signing access for the exact
  `com.unumae.app` artifact.
- Exercise genuine Apple Sign In, App Attest, DeviceCheck, push delivery,
  Resend fallback, and DeepL translation on the signed device.
- Confirm that the existing hosted provider configuration is usable without
  printing or copying any values. The repository records required secret names,
  not their contents.

## Phase E — hosted operations and recoverability

Required access/actions:

- Upgrade the single Supabase project to the required paid plan before public
  production traffic.
- Configure the protected backup workflow with GitHub Actions artifact storage
  for the closed beta. No S3 account or Docker installation is required for
  this interim path. The artifact retention is 35 days and does not provide
  PITR or object lock.
- Configure the protected backup/restore environment with these secret names:

  - `PRODUCTION_DATABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `BACKUP_AGE_SECRET_KEY` for restore
  - `RESTORE_DATABASE_URL` for the isolated hosted PostgreSQL target

- Configure these protected variables:

  - `SUPABASE_URL`
  - `BACKUP_AGE_RECIPIENT`

- Run and retain evidence of a scheduled database/storage backup and a timed
  restore into an isolated nonproduction target.
- Enable hosted health, scheduler, Edge Function, Storage, database, email,
  push, and quota alerts with named owners and test delivery.
- Exercise the draw, notification, deletion, credential, provider, pause,
  quota, moderation-backlog, and restore runbooks.

The existing repository scripts and workflow prepare this work; they do not
prove that the external backup destination, paid plan, alert delivery, or
incident staffing exists.

## Phase F — legal, staffing, and App Store Connect

Required access/actions:

- Approve and publish the controller identity, support contact, response target,
  Terms, Privacy Policy, Community Guidelines, deletion information, and
  third-party processor disclosures.
- Assign named coverage for portrait/question moderation, reports, appeals,
  privacy requests, Archive removal, deletion failures, and operational alerts.
- Use App Store Connect access to enter the reviewed EN/FR/DE metadata from
  `docs/app-store-metadata.json` and the review notes from
  `docs/APP_REVIEW_NOTES.md`.
- Capture required iPhone screenshots from the final representative build and
  use a genuine published cycle; never use an invented Human or testimonial.
- Build and submit only the signed artifact that passed the physical-device and
  release checks. Record the exact EAS build ID, build number, commit SHA, and
  App Store Connect version.

## Phase G — real people and production launch

Required access/actions:

- Recruit 10–20 internal-alpha participants and observe the four questions in
  `docs/BETA.md`.
- Run a bounded private beta of 100 active people for four complete weeks with
  moderator/operator coverage.
- Read the moderator-only retention functions only after cohorts mature:
  `growth_gate()`, `retention_cohorts()`, `participation_mix()`,
  `analytics_journey_funnels()`, and
  `analytics_notification_attribution()`.
- Preserve the precommitted thresholds: D1 25%, D7 10%, participation 15%,
  share rate 3%. Do not change them after seeing results.
- Release the exact tested artifact/backend SHA and observe the first complete
  UTC cycle, including selection, consent, moderation, publication, Q&A,
  rollover, Archive transition, alerts, and rollback readiness.

## Phase 15 — growth experiments

This phase is closed until Phase G produces a mature passing `growth_gate()`
result and the owner records an explicit decision. If it opens:

- use only the single organic sharing mechanism and approved public Humans;
- use the channel accounts needed for the four editorial surfaces in
  `docs/GROWTH.md` only after the gate opens;
- keep campaign records aggregate-only and outside the app’s per-person data;
- never add referral rewards, paid selection advantage, public popularity scores,
  or extra return notifications.

No API key is a substitute for the growth gate or owner authorization.

## Phase 16/H and Phase 17 — deferred work

These are not current launch blockers and are not approved for implementation:

- AI Interview Assistant: if later approved, it may need a model-provider
  account/key, processor/privacy review, retention/deletion design, moderation,
  accessibility coverage, and an explicit non-AI path.
- Human Story Engine: requires a lawful, consented research corpus and a
  decision that does not reintroduce per-person popularity or reach metrics.
- Where Are They Now?: requires five years, fresh consent, and Archive/removal
  review; no key can shorten that interval.
- Android: requires Google Play Console/Cloud access, Play Integrity service
  credentials, release-signing certificate digests, Android EAS access, and a
  physical Android device. See `docs/POST_IOS_ANDROID.md`.
- Monetization: requires an explicit product decision and payment-provider
  credentials, while preserving the rule that selection probability is never
  monetized.
- Full web/PWA: requires a separately approved scope and hosting/deployment
  access; it is not part of the current iOS release.

## Credential handling rules

- `EXPO_TOKEN`, `SUPABASE_ACCESS_TOKEN`, database passwords, service-role keys,
  Apple signing material, DeviceCheck private keys, Resend/DeepL keys, backup
  credentials, and any future provider keys stay in their protected stores.
- Public client values may use the documented `EXPO_PUBLIC_` names; service,
  provider, signing, and database credentials must never use that prefix.
- Never paste a secret into a Markdown handoff, issue, test fixture, build log,
  screenshot, or App Store evidence.
- Hosted commands require exact-SHA approval, bounded synthetic data, explicit
  cleanup, and a recoverable backup where destructive operations are involved.
- Docker is not required for the owner queue described here. The restore
  rehearsal uses an isolated hosted PostgreSQL target; no local database or
  container work is needed.

## Completion definition for this queue

This queue is complete only when each external dependency has an owner, a
timestamped evidence record, and a result tied to the exact release artifact or
hosted SHA. Until then, the repository-only checks may pass while the release
or post-launch phases remain open.
