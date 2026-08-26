# Reconciled implementation plan

This plan reconciles the roadmap-v2 audit with the binding release decisions:

- Product name: **Unumae**
- Current release: **iOS first**
- iOS bundle identifier: **`com.unumae.app`**
- Mobile infrastructure: **one EAS project**
- Backend infrastructure: **one hosted Supabase project**, plus disposable local
  development and CI stacks
- Android: preserved but deferred to `POST_IOS_ANDROID.md`

## Phase A — Reconcile and secure the source of truth

- Consolidate completed roadmap commits onto `main` without duplication.
- Remove staging assumptions from runtime config, EAS, workflows, tests, and
  active documentation.
- Make iOS the only current native release gate.
- Require exact-SHA CI provenance for hosted deployment.
- Keep secret values out of source, logs, artifacts, and documentation.

Exit: `main` contains the valid completed work, local verification passes, the
exact pushed SHA is evaluated by CI, and active documentation agrees.

## Phase B — Hosted infrastructure baseline

- Validate that the existing single Supabase project is correctly linked.
- Verify Auth configuration.
- Verify Storage buckets and policies.
- Verify Edge Function sources, versions, and authentication boundaries.
- Verify cron jobs and job history.
- Verify Vault secret names without printing values.
- Verify required iOS providers.
- Verify migrations are synchronized.
- Verify the EAS project linkage and single hosted variable environment.
- Capture a sanitized baseline of the hosted configuration.
- Ensure new work adds, exposes, duplicates, and commits no secrets.

Exit: the single hosted Supabase/EAS environment is correctly configured,
reproducible where practical, and usable for remaining hosted verification.

## Phase C — Prove Phases 1–6 on hosted infrastructure

- Deploy only an exact CI-passed SHA through the protected workflow.
- Use bounded synthetic accounts and explicit cleanup.
- Verify account restriction and Auth-session revocation.
- Verify account deletion against real hosted Auth and Storage; keep destructive
  failure injection local unless a recoverable hosted test is approved.
- Verify export schema and physical-iPhone file sharing.
- Verify App Attest/DeviceCheck registration, replay rejection, and review.
- Verify bounded report, analytics, installation-session, and token controls.
- Capture and review pre/post deployment baselines.

Exit: roadmap Phases 1–6 satisfy their hosted gates without requiring staging.

## Phase D — iOS providers and physical-device verification

- Configure and verify Expo Push.
- Configure and verify Resend where selection email fallback is required.
- Configure and verify DeepL while translation depends on it.
- Produce signed iOS development/preview/release builds as appropriate.
- Complete the physical-iPhone checklist.
- Verify App Attest and DeviceCheck.
- Verify universal/deep links and notification actions.
- Verify image upload and account/media deletion.
- Verify VoiceOver, Dynamic Type, Reduce Motion, offline recovery, slow-network
  behavior, and UTC rollover.

Exit: every platform included in the current launch—iOS only—passes its signed
physical-device and provider checks. Android requirements remain exclusively in
`POST_IOS_ANDROID.md`.

## Phase E — Operational safety

- Configure encrypted database and photo backups outside Supabase.
- Observe a successful scheduled backup.
- Perform and time a restore into an isolated local target.
- Enable hosted health and quota alerts.
- Exercise draw, notification, deletion, credential, pause, and quota incident
  runbooks.
- Meet the paid-plan gate before public production traffic.

Exit: recovery, monitoring, and incident ownership are demonstrated.

## Phase F — Legal, moderation, and App Store release

- Publish reviewed controller/support information and legal text.
- Reconcile App Store privacy labels with the final build.
- Staff moderation, appeals, privacy requests, and operational alerts.
- Produce EN/FR/DE metadata and real-device screenshots.
- Supply App Review instructions and a reviewable representative state.

Exit: every user-facing support and safety promise has a staffed process and the
exact iOS artifact is ready for review.

## Phase G — Alpha, private beta, and launch

- Run the 10–20-person internal alpha.
- Correct blocking usability and safety findings.
- Run the four-week private beta.
- Review deletion completion, moderation latency, delivery, quotas, crashes,
  and the approved retention metrics.
- Deploy and release the exact tested artifacts.
- Monitor the next complete daily cycle and retain evidence.

Exit: Unumae is ready for real iOS users. Android remains a separate post-iOS
release decision.
