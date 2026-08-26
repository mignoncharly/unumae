# Phase 8 — mobile correctness, attestation client, and Android

Phase 8 is implemented locally. Production rollout still requires signed
physical-device builds, provider configuration, and the Android EAS/Maestro
workflow described below.

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

Required release configuration:

- Public EAS variable `EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER` in development
  and production.
- Existing Edge secrets from `docs/VERIFICATION_POLICY.md`, including Apple
  Team/bundle configuration, DeviceCheck key material, Google Play service
  account JSON, package name, certificate digests, and the binding pepper.
- App Attest enabled for `com.unumae.app`; development builds receive the
  development entitlement and production builds the production entitlement.
- Play Integrity enabled and linked to the Play Console app.

## Android completion

Android now has verified HTTPS app links for `/human/*`, the custom app scheme,
adaptive icon configuration, resize keyboard behavior, safe-area/keyboard
insets, notification permission after channel creation, image downscaling and
private-prefix upload behavior, native stack back handling, and managed EAS
release signing. Production produces an AAB; the E2E profile produces an APK.

`.eas/workflows/e2e-android.yml` runs the shared guest navigation smoke flow on
a Pixel 6 Play Store image and a smaller Pixel-class emulator. The Play Store
image is necessary for Play Integrity coverage; emulator attestation is still
expected to remain outside the production draw unless Google returns the
configured production verdict.

## Verification

Local automated evidence:

- `npm run test:db:phase8` — 12 executable pgTAP assertions.
- `npm run typecheck`, `npm run lint`, `npm run format:check`.
- `npm test -- --runInBand` and migration/type verification.
- Expo config/schema checks and native module autolinking for Apple/Android.

Release evidence still required:

- App Attest plus DeviceCheck on a signed physical iPhone.
- Play Integrity on Play internal testing with the release certificate.
- Review-request resolution by a moderator and eligibility refresh.
- Android notification action/open, denied permission, offline retry, image
  picker/upload, HTTPS/custom deep links, keyboard, safe areas, and hardware
  Back on small and current devices.
- Successful Android EAS build, Maestro workflow, managed signing, and internal
  Play track install.

Current external blockers observed on 2026-08-26: the EAS production
environment does not yet contain `EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER`, and
EAS rejects Maestro-job validation until the account has a paid plan. Neither
condition is bypassed in application code.
