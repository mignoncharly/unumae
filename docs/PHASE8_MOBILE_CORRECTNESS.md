# Phase 8 — iOS mobile correctness and attestation client

Phase 8 is implemented locally. The current release is iOS-only and still
requires signed physical-iPhone builds and Apple provider configuration.
Existing Android work is preserved for `POST_IOS_ANDROID.md` and does not block
the iOS release.

## Mutation correctness

Portrait answer autosaves now call `save_my_portrait_answer` with a persistent
per-prompt revision. Revisions survive an answer being cleared, so an older
request cannot recreate deleted text. Submission sends the complete answer
snapshot and all expected revisions to
`save_answers_and_submit_my_portrait`; PostgreSQL saves the snapshot, validates
the photograph and five-answer minimum, and advances the portrait/draw states
in one transaction.

Notification switches use `patch_notification_setting`. Mutations are queued,
optimistic, rolled back on failure, and refresh the server value afterwards.
Settings mutation failures are visible rather than silently reverting.

Malformed live-Human records throw a recoverable application error. The
onboarding gate compares exact Expo Router segments. Notification responses
retry invitation-open recording three times, mark the response handled only
after work and routing complete, and clear a cold-start response only after
successful handling.

## Platform attestation

The client uses the official `@expo/app-integrity` native module:

- iOS creates and securely stores one App Attest key per account, requests a
  one-time server challenge, produces the App Attest object, and supplies an
  Apple DeviceCheck token through the local `ExpoDeviceCheck` bridge. The
  DeviceCheck bit remains the cross-account pool-binding signal. The client
  also exposes challenge-bound App Attest assertion generation for sensitive
  requests; an assertion is never treated as proof until a server verifies it.
- Android prepares the Play Integrity standard-token provider with
  `EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER`, requests a verdict bound to the
  one-time challenge, and sends a stable installation identifier plus the
  token to the existing verifier.
- Successful verification stores the 30-day attested installation session in
  SecureStore for bounded analytics and push registration.

Expo Go, web, and simulators display an explicit development state and remain
unattested. Unsupported or rejected physical devices can create an idempotent
`attestation_review_requested` signal. The existing moderator integrity queue
and append-only review decision flow then provide a seven-day human-review
path. Development state never raises assurance or bypasses production pool
enforcement.

Required iOS release configuration:

- Apple Team/bundle configuration, DeviceCheck key material, and the binding
  pepper from `docs/VERIFICATION_POLICY.md`.
- App Attest enabled for `com.unumae.app`; development builds receive the
  development entitlement and production builds the production entitlement.

## Preserved Android work — deferred

Android-compatible intent filters, adaptive icon configuration, resize keyboard
behavior, safe-area/keyboard insets, notification channels, image downscaling,
private-prefix upload behavior, native stack back handling, managed EAS release
configuration, Play Integrity client code, and an EAS/Maestro workflow are
present. They are not release evidence and do not block iOS.

Remaining Android provider eligibility, Play configuration, signed builds,
`assetlinks.json`, and physical-device verification are tracked only in
`POST_IOS_ANDROID.md`.

## Verification

Local automated evidence:

- `npm run test:db:phase8` — 12 executable pgTAP assertions.
- `npm run typecheck`, `npm run lint`, `npm run format:check`.
- `npm test -- --runInBand` and migration/type verification.
- Expo config/schema checks and native module autolinking.

Release evidence still required:

- App Attest plus DeviceCheck on a signed physical iPhone.
- Review-request resolution by a moderator and eligibility refresh.

Current external iOS blocker observed on 2026-08-26: EAS rejects hosted
Maestro-job validation until the account has a paid plan. A local macOS runner
remains available. Android-only configuration is deferred and is not an iOS
blocker.
