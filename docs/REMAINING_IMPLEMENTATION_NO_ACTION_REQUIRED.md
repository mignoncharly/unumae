# Remaining implementation: no action required from the owner

Status: 29 August 2026

This is the repository-only queue. It contains work that can be inspected,
documented, tested, or improved locally without owner credentials, paid
services, a physical device, App Store Connect access, hosted mutations, or
Docker. It does not claim that the external release gates are complete.

## Current boundary

The MVP implementation is present. The remaining launch-critical behavior is
blocked by external evidence, not by an identified missing local feature. Do
not use this file as permission to add AI, monetization, Android release work,
full PWA behavior, or conventional growth mechanics.

The active phase position is:

| Phase | Repository-side state | What remains outside this queue |
| --- | --- | --- |
| A–C | Complete according to retained phase evidence | Re-run only after backend changes deploy |
| D | Code and automation prepared | Signed iOS build, physical iPhone, provider/device evidence |
| E | Free-plan backup/restore automation and documentation prepared | Scheduled-backup evidence, future isolated restore target, alert delivery and drills |
| F | Metadata, App Review notes, legal-route checks prepared | Approved controller/support identity, staffing, screenshots, final signed artifact and submission |
| G | Alpha/beta/launch evidence pack prepared | Real participants, four-week beta, release and first complete production cycle |
| 15 | Growth handoff prepared and closed | Mature `growth_gate()` result and explicit owner authorization |
| 16/H | Deferred-feature guardrails prepared and closed | Explicit post-launch decision; no deferred feature is approved today |

The final local hardening pass also corrected generated Supabase types, the
website footer's 44-point contact target, and first-party crash reporting. The
crash path redacts and bounds diagnostics, uses attested ingestion, retains
rows for 90 days, and retries one redacted fatal report after restart. No
third-party crash processor or additional owner credential is required.

## Repository-only work that can continue

### Documentation reconciliation

- Keep this repository-only queue aligned with
  `REMAINING_IMPLEMENTATION_EXTERNAL_ACCESS_REQUIRED.md` and phase evidence.
- Keep older roadmap and phase evidence explicitly historical; Git retains
  superseded plans that no longer need to remain in the working tree.
- Keep the privacy inventory, App Store declarations, legal routes, moderation
  promises, and shipped behavior synchronized.
- Maintain the exact-build, exact-SHA, rollback, backup, and launch evidence
  templates without entering personal data or secret values.

### Local verification and drift prevention

- Maintain the existing TypeScript, lint, formatting, migration, schema,
  accessibility, security, and Jest coverage.
- Maintain the read-only phase gates:
  `verify:app-store`, `verify:phase-g`, `verify:growth`, and
  `verify:phase-16`.
- Add or improve source-level regression tests when a local bug or documentation
  drift is found.
- Keep the EN/FR/DE website build, metadata, privacy routes, universal-link
  association, and public guest experience internally consistent.
- Keep secret scanning and safe-path checks in all new scripts and workflows.
- Keep generated-type drift diagnostics bounded so fresh-schema CI failures are
  actionable without printing data or credentials.

### Release-pack maintenance

- Keep `docs/app-store-metadata.json` within App Store Connect limits and aligned
  with the approved product vocabulary.
- Keep `docs/APP_REVIEW_NOTES.md` factual about guest access, deletion, Quiet
  Day, moderation, appeals, and sign-in.
- Keep `docs/PHASE_F_RELEASE_READINESS.md` and
  `docs/PHASE_G_LAUNCH_READINESS.md` aggregate-only and free of participant
  personal data.
- Keep `docs/PHASE_15_GROWTH_READINESS.md` closed until the mature beta gate.
- Keep `docs/PHASE_16_SCALE_READINESS.md` design-only; do not implement the
  deferred AI, Story Engine, or five-year revisit without a recorded decision.

## Safe local commands

These commands do not start Docker, query Supabase, or mutate hosted state:

```text
npm run verify
npm run web:check
npm run scan:secrets
npm run verify:app-store
npm run verify:phase-g
npm run verify:growth
npm run verify:phase-16
```

The hosted simulation, deployment, backup rehearsal, provider verification,
physical-device checks, EAS signing, and App Store submission are intentionally
excluded. They belong in
[`REMAINING_IMPLEMENTATION_EXTERNAL_ACCESS_REQUIRED.md`](C:/onehuman/docs/REMAINING_IMPLEMENTATION_EXTERNAL_ACCESS_REQUIRED.md).

## Completion definition for this queue

This queue is complete when repository documentation agrees with the current
implementation, all local gates pass, all release packs are internally
consistent, and no unapproved post-launch feature has entered the iOS product.
It cannot close Phase D–G or open Phase 15/16 by itself.
