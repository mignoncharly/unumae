# Unumae — remaining implementation phases

Status date: **28 August 2026**

This is the active forward-looking plan after completion of Phase A and Phase B. It consolidates the remaining work from `IMPLEMENTATION_PLAN_RECONCILED.md`, `PHASE_B_HOSTED_BASELINE.md`, `OPEN_ITEMS.md`, the release documentation, and the confirmed project decisions.

## Current position

| Item | Status |
| --- | --- |
| Phase A — source-of-truth reconciliation | Complete |
| Phase B — hosted infrastructure baseline | Complete |
| UI/UX context extraction prerequisite | Complete; design-context files are in `docs/design/` |
| Phase C — hosted proof of Phases 1–6 | **Complete; hosted evidence captured** |
| Phase D — iOS provider and physical-device verification | **Next**; intentionally deferred until signed-device work is resumed |
| Phases E–G | Not started |

The UI/UX context package is an analysis and design handoff. It does not authorize a production UI redesign, and it does not change the phase exit criteria below.

Phase E is now in progress on the repository side. Backup restore automation
verifies encrypted storage contents and critical database/media integrity;
scheduled-backup, restore, paid-plan, alert-delivery, and incident-drill
evidence remain pending in the protected hosted environment.

Phase F is now in progress on the repository side. The exact EN/FR/DE App Store
metadata, App Review notes, required URL/privacy/build invariants, and Apple
association are checked by `npm run verify:app-store`. Reviewed controller
identity, staffed response targets, real-device screenshots, the final signed
artifact, and App Store Connect submission remain owner-only gates.

Phase G is prepared on the repository side. The alpha/private-beta evidence
template, precommitted retention gate, exact-build traceability, aggregate-only
cohort rule, and first-cycle launch checklist are checked by
`npm run verify:phase-g`. Participants, staffed operations, the signed release,
and the first complete post-release cycle remain owner-only gates.

Phase 15 growth work is prepared but remains closed. The growth-experiment
handoff and verifier preserve the precommitted `growth_gate()` requirement,
single organic sharing mechanism, measurement boundary, and stop conditions;
`npm run verify:growth` cannot open the gate or authorize paid acquisition.

Phase 16 / macro-phase H remains design-only and closed. The scale-and-deferred
feature handoff records guardrails for the AI Interview Assistant, Human Story
Engine, and five-year revisit; `npm run verify:phase-16` confirms that these
features, along with Phase 17 monetization/Android/full-web work, remain outside
the current iOS product until an explicit post-launch decision.

## Binding scope decisions

- The current release is **iOS only**.
- Android remains technically preserved but is deferred to `POST_IOS_ANDROID.md`; it is not a Phase C–G iOS release blocker.
- Unumae uses **one hosted Supabase project** and **one EAS project**. No staging project, staging services, or staging-promotion workflow may be introduced.
- Hosted changes must be deployed from an exact, approved, CI-passed `main` SHA through the protected deployment workflow.
- Synthetic hosted verification must be bounded, identifiable, reversible, and explicitly cleaned up.
- Existing secrets must never be printed or copied into documentation, logs, fixtures, or source control.
- Physical-iPhone, signed-build, App Store submission, and genuine Apple-provider evidence are not part of Phase C. They belong to Phase D or Phase F as stated below.
- No unrelated post-launch features are part of these phases.

## Phase C — prove Phases 1–6 in hosted infrastructure

### Objective

Prove the already implemented account, deletion, privacy/export, abuse-control, analytics, and installation-session behavior against the single hosted Supabase environment without using staging and without requiring a signed physical-device build.

### C1 — protected deployment and evidence boundary

- Confirm the candidate `main` SHA is exact, approved, pushed, and green in all required CI checks.
- Capture a sanitized pre-verification baseline of migrations, Edge Functions, Auth health, Storage, RLS, cron, Vault secret names, and relevant operational health.
- Use the protected `Deploy hosted environment` workflow if repository changes require deployment.
- Record workflow run IDs, tested SHA, synthetic identifiers, cleanup results, and sanitized post-verification baseline.

### C2 — Phase 1 account enforcement

- Create bounded synthetic accounts with no connection to real users.
- Verify suspension and ban enforcement across database access and Edge Function boundaries.
- Verify account-status/version changes revoke or invalidate active access as designed.
- Verify the client/session contract can recover correctly after a permitted restoration.
- Confirm restricted users retain only the explicitly allowed appeal, export, and deletion paths.
- Clean up every synthetic account and artifact.

### C3 — Phase 2 retryable account deletion

- Create a disposable hosted account with representative Profile, avatar, portrait media, private actions, and—where safely reproducible—published-history/tombstone relationships.
- Request deletion and verify the hosted state progression through account lock, Storage deletion, database deletion, Auth deletion, and completion.
- Confirm avatar and portrait media are removed, Auth access is gone, private data is removed, and retained draw/Archive records contain only the permitted tombstone/audit data.
- Verify idempotent retry behavior with safe hosted requests.
- Keep destructive worker/failure injection local unless a specific hosted failure is demonstrably recoverable and approved within the test harness.
- Record and clean up all remaining synthetic artifacts.

### C4 — Phase 5 privacy export

- Seed a synthetic account with representative profile, assurance, notification, moderation, Remember, and journey history where supported by existing fixtures.
- Generate the hosted export and validate its schema, completeness, scoping, and absence of another user's data.
- Verify that removed/redacted data follows the documented export contract.
- Do not treat native iOS share-sheet output as a Phase C gate; that evidence belongs to Phase D.
- Securely remove the generated fixture/export artifacts after validation.

### C5 — Phase 6 abuse, analytics, and installation-session controls

- Verify hosted report limits, analytics-ingest bounds, token/session limits, malformed-request rejection, authorization boundaries, and replay/stale-request defenses that can be exercised without a genuine Apple attestation.
- Verify the manual attestation-review path and hosted state transitions with bounded synthetic data.
- Keep abusive-volume/load testing local; use only bounded hosted probes that cannot degrade the shared environment.
- Verify data retention and orphan cleanup for the exercised paths.
- Defer genuine App Attest/DeviceCheck provider responses and signed-device replay evidence to Phase D.

### C6 — closeout and parity

- Confirm hosted migration history exactly matches the repository.
- Confirm hosted Edge Functions exactly match the repository set and are healthy.
- Confirm Auth, Storage, cron, Vault secret names, RLS, and operational health remain valid after testing.
- Capture a sanitized post-verification baseline and compare it with the pre-verification baseline.
- Confirm all synthetic accounts, media, tokens, reports, analytics events, and test-only records were removed or intentionally retained only where audit semantics require them.
- Update Phase C evidence and `OPEN_ITEMS.md` with only genuinely remaining owner/device work.

### Phase C exit

All Phases 1–6 checks that are safely verifiable without a signed physical iPhone pass against the single hosted environment from an exact green `main` SHA. Repository/hosted migration and Edge Function parity is confirmed, the environment remains healthy, test data is cleaned up, and device-dependent evidence is explicitly carried into Phase D rather than being claimed complete.

## Phase D — iOS providers and physical-device verification

### Objective

Prove the complete native iOS experience with signed builds and a physical iPhone. This phase begins only when signed-device testing is resumed.

### Work

- Reconfirm Expo Push, Resend fallback, DeepL, Apple Sign In, App Attest, and DeviceCheck configuration without exposing secret values.
- Produce the appropriate signed iOS development/preview/release builds from an exact green SHA.
- Install on at least one physical iPhone and complete `IOS_RELEASE_VERIFICATION.md`.
- Verify Sign in with Apple, account switching, session/cache cleanup, and restricted-account routing.
- Verify genuine App Attest/DeviceCheck registration, installation-session issuance, replay rejection, invalid/stale assertions, and manual-review fallback.
- Verify Expo Push delivery, notification categories/actions, receipts, permanent invalid-token removal, and Resend email fallback.
- Verify DeepL translation behavior while preserving original text.
- Verify universal links, custom-scheme links, cold/warm notification routing, and back-navigation context.
- Verify photo permission states, portrait upload/replacement, signed image loading, media deletion, account deletion, and the export/share sheet.
- Verify VoiceOver, Dynamic Type, Reduce Motion, contrast, touch targets, keyboard behavior, safe areas, offline recovery, slow-network behavior, and UTC rollover.
- Retain reproducible evidence tied to the exact tested build/SHA.

### Phase D exit

The signed iOS artifact passes provider, physical-device, accessibility, offline, slow-network, media, deletion, notification, deep-link, and UTC-rollover checks. Android remains deferred and contributes no exit criterion.

## Phase E — operational safety and recoverability

### Objective

Demonstrate that Unumae can be monitored, backed up, restored, and operated safely before public production traffic.

### Work

- Meet the required Supabase paid-plan gate before public production traffic.
- Configure encrypted database and private-photo backups outside the primary hosted project.
- Observe and retain evidence of a successful scheduled backup.
- Restore a complete backup into an isolated local or otherwise nonproduction target; time and document the rehearsal.
- Verify restored database relationships, private media references, tombstones, critical functions, and representative reads.
- Enable hosted health, scheduler, Edge Function, Storage, database, email/push, and quota alerts with named owners.
- Exercise draw, notification, deletion, credential, provider, pause, quota, moderation-backlog, and restore incident runbooks.
- Confirm escalation routes and response ownership rather than relying only on written procedures.

### Phase E exit

Backup creation, isolated restoration, monitoring, alert delivery, runbook execution, and incident ownership are demonstrated with retained evidence.

## Phase F — legal, moderation, and App Store release readiness

### Objective

Make the exact iOS artifact legally supportable, operationally staffed, and reviewable by Apple.

### Work

- Publish reviewed controller identity, support contact, Terms, Privacy Policy, Community Rules, deletion information, and response expectations.
- Reconcile the final build, privacy manifest, App Store privacy labels, personal-data inventory, and third-party processors.
- Confirm operational staffing and response targets for portrait/question moderation, reports, appeals, privacy requests, Archive removal, deletion failures, and alerts.
- Produce final EN/FR/DE App Store title/subtitle/description/keywords/release notes where supported by App Store Connect.
- Capture real-device screenshots for the required iPhone sizes from the final representative build.
- Prepare App Review instructions, reviewer access or a representative review state, moderation explanation, and any required notes about guest access and the selected-Human lifecycle.
- Submit only the exact signed artifact that passed Phase D and release checks.

### Phase F exit

Legal text and privacy disclosures match the shipped behavior, every safety/support promise has an owner, App Store metadata and screenshots are complete, and Apple can review the exact approved iOS artifact.

## Phase G — alpha, private beta, and public iOS launch

### Objective

Validate the product with real people, correct launch-blocking findings, and release the exact tested system with close operational monitoring.

### G1 — internal alpha

- Recruit 10–20 representative participants.
- Run the internal alpha described in `BETA.md` using the production-shaped hosted environment and controlled daily cycles.
- Observe comprehension of Today's Human, invitation/portrait completion, Archive use, Remember, thoughtful questions, safety/reporting, accessibility, and trust in selection fairness.
- Correct blocking usability, safety, privacy, reliability, and operational findings.
- Repeat relevant automated, hosted, and physical-device gates after fixes.

### G2 — four-week private beta

- Enroll a bounded private-beta cohort only after alpha exit.
- Run for four complete weeks, including daily cycles and moderator/operator coverage.
- Review deletion completion, moderation latency, push/email delivery, provider failures, quota/health alerts, crashes, Archive/media behavior, D1/D7 retention, participation mix, and approved funnel metrics.
- Do not add engagement mechanics to compensate for weak retention; evaluate the finite product on its stated promise.
- Resolve launch blockers and retest the exact release candidate.

### G3 — launch and immediate observation

- Promote/release the exact artifact and backend SHA that passed the final gates.
- Verify production health, notification/email delivery, moderation coverage, support channels, and backup status at release.
- Monitor at least the next complete UTC daily cycle, including selection, consent, moderation, publication, Q&A, rollover, Archive transition, and alerts.
- Retain release, monitoring, incident, and rollback evidence.

### Phase G exit

The alpha and four-week private beta demonstrate acceptable safety, usability, reliability, operations, and product behavior; the exact tested iOS release is live; and at least one complete post-release UTC cycle has been observed successfully.

## Owner-only actions remaining

These are the actions that genuinely require a human or external-account decision. They should be performed only when their phase is active.

1. Provide access to a physical iPhone or trusted tester and authorize/install the signed build for Phase D.
2. Approve any EAS/App Store Connect signing or submission interaction that cannot be completed with existing access.
3. Upgrade Supabase to the required paid plan before public production traffic in Phase E.
4. Approve the external encrypted-backup destination and retention policy.
5. Approve/publish final legal/controller/support text and staff the named operational channels.
6. Recruit the 10–20-person alpha and later the private-beta cohort.
7. Approve the final App Store submission and phased/manual release decision.

## Explicitly outside this plan

- Android release work; see `POST_IOS_ANDROID.md`.
- A staging Supabase/EAS environment or staging-to-production promotion process.
- AI interviewing, a Human Story Engine, Where Are They Now, subscriptions, monetization, full PWA, and optional audio/video portraits.
- Production UI redesign implementation unless it is separately authorized after review of the `docs/design/` handoff.
