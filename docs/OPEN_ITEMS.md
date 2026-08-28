# Open items

Who owns what, so nothing is forgotten between sessions. Updated at the end of
each phase. ⚠️ blocks a real cycle from running.

Last updated: Phase C hosted verification closeout, 28 August 2026.

---

## Yours — needs a human, an account, or a decision only you can make

| # | Item | Why it needs you | Blocks |
| --- | --- | --- | --- |
| 1 | **App Store listing URL** | The numeric App Store Connect ID is now known (`6804251671`), but Apple provides the public listing URL only when the app is released. | App Store badge and smart app banner. |
| 2 | **A light version of the wordmark**, if you want a dark splash | The icon and splash are wired up. The supplied gradient measures 1.32:1 against `#0B0B0C`, so the splash stays white in both appearance modes. | Nothing. White reads everywhere. |
| 4 | ⚠️ **Native iOS release gate** | No physical iPhone is currently available to the owner. Create/install a development or TestFlight build on a borrowed or trusted tester's iPhone, then execute every real-device and accessibility check in `docs/IOS_RELEASE_VERIFICATION.md`. Simulator automation cannot prove Apple credentials, push delivery/actions, account switching cleanup, media deletion, VoiceOver, or native share sheets. | Public beta. |
| 5 | **Recruit 10–20 people for the internal alpha** | The simulation proves the machinery works. It cannot tell you whether Today's Human is interesting, whether anyone opens the Archive, or whether anyone shares a portrait unprompted. Only real people answer that. `docs/BETA.md` has the four questions to watch for. | The growth gate, and everything after it. |
| 7 | **Check the share card on a real device** | Settings → Developer → Share card. It names which of the two native modules loaded, renders the card scaled to fit, and captures it to a real PNG that it then displays — the preview proves the layout, only the capture proves the capture. | Nothing — the fallback works. |
| 8 | **Credentials remain local** | `docs/supa_keys.md` was used through redacting wrappers for the database deployment and live suites. It remains gitignored and unmodified. The authenticated CLI credential was passed to the read-only hosted Auth verifier in memory; no credential entered logs or version control. | Nothing. |
| 10 | **EAS Maestro plan or a macOS runner** | Expo accepts built-in Maestro jobs only on a paid plan for this account. Run `npm run e2e:ios` on a Mac with Xcode/Maestro, or enable the plan and use `npm run e2e:ios:eas`. | Automated iPhone-size evidence; real-device checks remain separate. |
| 11 | ✅ **Production selection-email credentials configured** | `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` are present in the hosted Edge secret store. End-to-end fallback delivery remains a Phase D provider test. | Nothing in Phase B. |
| 12 | ⚠️ **Supabase paid-plan timing** | Roadmap v2 makes Pro a hard gate before production traffic. Free has no managed backups, one-day logs, quota restrictions, and inactivity pausing. | Production traffic. |
| 13 | ✅ **Single hosted infrastructure baseline complete** | Auth, Storage, 11 Edge Functions, 16 cron jobs, Vault secret names, required iOS/provider secret names, 52 migrations, EAS linkage, public variables, and sanitized pre/post baselines were verified. See `docs/PHASE_B_HOSTED_BASELINE.md`. | Nothing. |
| 14 | ✅ **Deploy and verify Phase 1 on the hosted project** | Hosted bounded account-enforcement, moderation, appeal, token, and privacy-boundary checks passed with explicit cleanup in Phase C run [33154080116](https://github.com/mignoncharly/unumae/actions/runs/33154080116). | Nothing; native release work remains in Phase D. |
| 15 | ⚠️ **Complete the native portion of Phase 2 deletion verification** | Hosted bounded deletion, Storage cleanup, Auth cleanup, and retry/idempotency checks passed in Phase C. Physical-iPhone deletion and native media/share behavior remain for Phase D. | Native iOS release gate and public beta. |
| 16 | ✅ **Required GitHub checks and branch protection enabled** | `main` requires strict `Application`, `Website`, and `Fresh database and Edge Functions` checks. Pull requests are required, stale approvals are dismissed, and administrator enforcement is enabled. | Nothing. |
| 17 | ✅ **`EXPO_TOKEN` configured** | The GitHub Actions secret exists and authenticates as the EAS project owner. | Nothing. |
| 18 | ⚠️ **Provider-test iOS attestation** | All required hosted Apple/App Attest/DeviceCheck secret names and the binding pepper are present. Genuine provider responses still require a signed build and physical iPhone in the deferred native portion of Phase D. Android/Play Integrity is deferred. | Native iOS release gate and public beta. |
| 19 | **Monitor the Expo toolchain's `uuid` advisory** | `npm audit --audit-level=high` passes, but the root tree currently reports 12 moderate transitive findings through Expo config tooling → `xcode` → `uuid`. npm's complete forced remediation downgrades to Expo 46, so take the next compatible Expo/upstream fix instead of breaking the app framework. | No current high-severity release block; review on every dependency update. |
| 20 | ⚠️ **Complete the native portion of Phase 5 export verification** | Hosted bounded export scoping/completeness and cleanup passed in Phase C. Physical-iPhone share-sheet evidence and final App Store privacy reconciliation remain. | Native iOS release gate and public beta. |
| 21 | ⚠️ **Complete the provider portion of Phase 6 verification** | Hosted bounded report, analytics, token, malformed-request, replay/stale-request, and manual-review checks passed in Phase C. Genuine iOS App Attest/DeviceCheck evidence remains for Phase D. | Native iOS release gate and public beta. |
| 23 | ⚠️ **Recruit a second moderator** | Appeals are enforced in the database to require a different moderator from the one who decided. With a one-person roster every appeal against that person's own decision is permanently undecidable. Two addresses for the same human satisfy the check and defeat its purpose. `appeal_review_capacity()` reports the roster; a critical `appeal_unreviewable` alert fires when an appeal is stuck. See `docs/MODERATION.md` §3a. | Public beta. |
| 24 | **Staff the published contact address** | `hello@unumae.app` is now on every website page and named in the privacy policy, which promises a person answers within 30 days. It needs to reach somebody. | Nothing technical; the promise is live once the site deploys. |
| 22 | ⚠️ **Provider-test Phase 7 on iOS** | Verify DeepL, Expo Push and Resend categories, delayed receipts, permanent-token invalidation, iOS notification behavior, and real hosted quota observations. Android channels are deferred. | Hosted Phase 7 completion and reliable notification operations. |

## Mine — code

The MVP build is finished. Everything below is deliberately deferred, with the
reasoning in `docs/DEFERRED.md`.

| # | Item | Why deferred |
| --- | --- | --- |
| 1 | AI Interview Assistant | The plan excludes it from the MVP in as many words. It would put a language model between a person and their own words before we know whether the guided prompts are enough. |
| 2 | Human Story Engine | Needs a corpus that does not exist yet, and a definition of "interesting" that is not engagement — which this product has deliberately made unmeasurable per person. |
| 3 | Where Are They Now? | Needs five years. Nothing to build; nothing must be broken in the meantime. |
| 4 | Monetization, Android, full PWA | Post-launch. Android's preserved work and remaining gates are in `POST_IOS_ANDROID.md`. |
| 5 | Stronger identity assurance, only if beta abuse justifies it | Liveness was explicitly removed from the beta policy and database in Phase 5. Any future version needs consent, a processor, accessibility fallback, retention/deletion guarantees, and a policy amendment. |
| 6 | Optional audio/video portrait element | Later. |

## Needs a native build, not Expo Go

The release target is iOS. These features require an iOS development/TestFlight
build rather than Expo Go or a simulator:

| Feature | Why | State |
| --- | --- | --- |
| Sign in with Apple | Expo Go signs its own bundle, so it cannot carry this app's entitlement | Implemented; hides itself and explains why. Email code works everywhere. |
| Push notifications | Expo Go has no push credentials for this bundle | Built; needs a dev build to test |
| Downloadable data export | Uses the native share sheet to save/send the JSON file | Implemented; verify the sheet in a development build |

Everything else — the draw, portraits, questions, voting, Remember, image
picking, storage, the Signals tab — runs in Expo Go.

## Deployed and verified against the live project

This table reflects the live deployment and verification completed through 25
August 2026.

| Thing | State |
| --- | --- |
| Supabase project | `qpicjsjxdblrxdrdibge`, CLI linked |
| Migrations | All 52 applied; local and remote histories match through `20260826120000` |
| Edge Functions | All 11 repository functions are deployed and `ACTIVE`, with no missing or extra hosted functions. All 11 routes pass CORS preflight. |
| Storage buckets | `avatars`, `portraits` — both private |
| Scheduled jobs | All 16 hosted cron jobs are active; scheduled-function credentials are present in Vault. |
| EAS project | `@mignoncharly/unumae` |
| EAS build environment | One EAS project and one hosted `production` variable environment; project linkage and `EXPO_TOKEN` authentication are verified. |
| App Store Connect | Unumae app record `6804251671` for `com.unumae.app`; production build `0.1.0 (3)` successfully uploaded to TestFlight on 24 August 2026 and is processing with Apple |
| Apple provider | enabled, `com.unumae.app` confirmed in its Client IDs |
| Hosted Auth/email | Production Site URL, native/web redirects, six-digit confirmation and magic-link templates, Apple provider, and custom SMTP all pass the read-only release check |
| Moderator bootstrap | seeded by email; promotes automatically on profile creation |
| Draw verification | database and independent implementation agree |
| Anonymous access | 96 checks, matches the allowlist |
| Signed-in privilege escalation | 31 checks, all refused |
| **Full loop, end to end** | **passes — draw, invitation, acceptance, portrait, moderation, publication, audience, Archive** |
| **Escalation** | **passes — decline and silence both promote a backup who can actually accept** |
| Nightly jobs | pg_net → Edge Function proven end to end: one queued call produced 30 translations |
| Tests | 667 tests across 49 suites passed locally; exact-`main` Application, Website, fresh-database, pgTAP, Edge, security, Expo Doctor, secret-scan, and audit gates passed remotely. |
| Marketing website | Live at `https://unumae.app`; isolated Nginx site, TLS, monitoring and renewal verified |

## Commands worth remembering

```bash
npm run verify            # typecheck, lint, format, migrations, tests — offline
npm run verify:live       # draw cross-check + anonymous access probe
npm run verify:security   # attacks the live database as a signed-in user
npm run verify:release-config # read-only hosted Auth/email release gate
npm run verify:delete-account:live # proves auth, data, and media deletion
npm run simulate          # the whole loop in three minutes; cleans up after itself
npm run db:push           # apply pending migrations
npm run db:list           # confirm remote matches local — always check after a push
npm run db:settings       # give the nightly jobs their credentials
```

⚠️ Run `npm run simulate` after any migration touching the draw, moderation,
publication or escalation. Four bugs have been found this way — two of them
fatal and invisible to a green test suite — because the schema guards read SQL
as text and cannot tell you it runs.

Operational detail, including the full nightly schedule and what each instrument
means: `docs/OPERATIONS.md`.
