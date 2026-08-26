# Post-iOS Android backlog

Android is officially deferred. Unumae is an iOS-first product for the current
release. Existing React Native, Expo, Android configuration, notification
channels, Play Integrity client code, and Android EAS workflow are preserved so
the later Android release does not require a rewrite, but none is an iOS launch
gate.

## Not required for the iOS release

- Android signed development, preview, or Play Store builds
- Google Play Integrity provider configuration or physical-device evidence
- Google provider sign-in and Android pool eligibility
- `/.well-known/assetlinks.json`
- Android app-link, notification-action, picker/upload, keyboard, safe-area,
  offline, or hardware-Back release verification
- Android EAS/Maestro execution, AAB signing, or Play internal-track install

## Work before an Android release

1. Decide the supported Android OS/device range and Play distribution regions.
2. Implement and test a stable provider sign-in path suitable for Android so a
   user can satisfy provider-based pool eligibility.
3. Configure Play Integrity, the Google Cloud project, service account, package
   name, production certificate digests, and server-side verdict policy.
4. Obtain the managed release-signing SHA-256 certificate and publish a correct
   `/.well-known/assetlinks.json` on `unumae.app`.
5. Produce signed Android development and release builds and install through a
   Play internal track.
6. Run the preserved Android EAS/Maestro workflow and physical-device checks for
   notification permission/actions, deep links, image handling, deletion,
   keyboard/safe areas, offline recovery, and hardware Back.
7. Reconcile Google Play data-safety, content-rating, account-deletion, support,
   and store-listing declarations with the released behavior.
8. Add Android to the active release checklist only after its launch is
   explicitly approved.

## Cross-platform preservation rule

New iOS work should keep shared TypeScript and React Native paths portable where
practical. Do not remove working Android-compatible code merely because Android
is deferred. Android-only work may be changed when necessary to keep builds
compilable, but it must not consume the current iOS release critical path.
