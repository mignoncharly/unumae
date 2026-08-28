# Release checklist

This checklist implements the verification layers required by Phase 0 of
`docs/implementation-roadmap-v2.md`. A release record names the exact commit,
migration, build, environment, date, operator, result, and evidence location.

Public beta is blocked until roadmap Phases 1–5 are complete. Production
traffic is additionally blocked by the device and moderation gates.

## 1. Local static verification

- [ ] Working tree contains only reviewed release changes.
- [ ] `npm ci` completed from the committed lockfile.
- [ ] `npm run verify` passed.
- [ ] `npx expo-doctor` passed all checks.
- [ ] `npm --prefix website run quality` passed, including every browser
      profile and Lighthouse after any unrelated browser failure.
- [ ] Root and website production dependency audits were reviewed.
- [ ] Every new migration is forward-only and has a rollback entry.
- [ ] No secret, credential file, generated bundle, or private data is staged.

## 2. Local ephemeral-database verification

The `Fresh database and Edge Functions` CI job automates this layer on every
pull request and protected-branch push. Local execution is still useful for
diagnosis, but the required remote result is the release evidence.

- [ ] Docker is available and `supabase start` created a fresh stack.
- [ ] All migrations applied from an empty database.
- [ ] `supabase db lint --local` passed.
- [ ] Generated database types match the migrated schema.
- [ ] Executable RLS and privilege tests passed for every relevant role/state.
- [ ] The compressed daily-cycle simulation passed locally.
- [ ] Edge Function authentication, timeout, and retry tests passed.
- [ ] The local stack was destroyed after evidence was captured.

Do not replace this layer with source-string assertions.

Required GitHub checks are `Application`, `Website`, and `Fresh database and
Edge Functions`. Protect the release branch against direct pushes and require
all three checks; a local hook is not a security boundary.

## 3. Hosted infrastructure and verification

Unumae has one hosted Supabase project and one EAS project. There is no staging
environment. Hosted probes therefore use bounded synthetic data, explicit
cleanup, and a protected exact-SHA deployment after local and CI verification.

Infrastructure baseline status: completed on 27 August 2026 for commit
`521257678bb388dccf1418b1002ea2ed694b6ed0`. See
`docs/PHASE_B_HOSTED_BASELINE.md`. The checkboxes below remain reusable for each
future release candidate and are not permanently pre-checked by that baseline.

- [ ] The existing hosted Supabase project is correctly linked.
- [ ] Auth, Storage, Edge Functions, cron jobs, Vault secret names, and required
      iOS providers match the approved configuration.
- [ ] Hosted migrations match the release commit.
- [ ] Edge Function deployment versions match the release record.
- [ ] EAS project linkage and the single hosted variable environment are correct.
- [ ] A sanitized pre-deployment hosted baseline was captured.
- [ ] Draw, safety, privacy, memory, deletion, and full-cycle suites passed.
- [ ] Failed jobs and synthetic data were cleaned up.
- [ ] A sanitized post-deployment baseline was captured and reviewed.
- [ ] Deployment approval names the exact evidence and commit SHA.
- [ ] No secret value entered source, logs, artifacts, or release evidence.

## 4. EAS and native-device verification

- [ ] The release-candidate workflow checked out a full commit SHA and proved a
      successful `CI` run exists for that exact SHA.
- [ ] The build commit passed static, database, and bounded hosted verification.
- [ ] `eas config --platform ios --profile production` is correct.
- [ ] Only expected public Supabase client variables are loaded.
- [ ] A new immutable iOS build number and EAS build ID are recorded.
- [ ] Maestro simulator checks passed on small, regular, and large iPhones.
- [ ] The recorded EAS/Maestro workflow used the same checked-out commit SHA.
- [ ] Every applicable real-device and accessibility item in
      `docs/IOS_RELEASE_VERIFICATION.md` passed.
- [ ] Native auth, push, export, deletion, sharing, offline recovery, and
      account switching were exercised on physical hardware.
- [ ] App Attest and DeviceCheck passed on a signed physical iPhone; the
      simulator showed the non-attested development explanation.
- [ ] App Store privacy answers and manifest match released behavior.

Android is not part of the current release. Its provider, Play Integrity,
signed-build, app-link, and device-verification gates live in
`docs/POST_IOS_ANDROID.md` and do not block iOS.

## 5. Production promotion

- [ ] Roadmap Phases 1–5 are complete for public beta.
- [ ] A backup generation exists and one restore rehearsal has passed with its
      elapsed time recorded. This is the whole backup story on the Free plan.
- [ ] A fresh encrypted off-platform backup exists and restore was rehearsed.
- [ ] Storage backup policy is implemented or the approved no-backup decision
      is reflected in user-facing policy.
- [ ] `npm run db:list` shows the expected migration state.
- [ ] `npm run baseline:production` was captured before and after promotion.
- [ ] `npm run verify:release-config` passed with a scoped token.
- [ ] Function versions and secret names were captured without secret values.
- [ ] Migrations and functions came only from the approved commit/path.
- [ ] Hosted live verification passed.
- [ ] Alerts and job history were watched through the next daily cycle.
- [ ] Rollback owner and trigger were named before promotion.

## 6. Over-the-air updates

`expo-updates` gives JavaScript-only fixes a path that does not wait on App
Review. It is a repair tool, not a release channel.

**Before publishing any update**

- [ ] The fix is JavaScript or asset only. Anything touching a native module,
      an entitlement, a permission string or `app.config.ts` needs a new
      binary — an OTA bundle cannot change the native side, and shipping one
      that assumes otherwise crashes on launch for everyone who takes it.
- [ ] The change is a bug fix or content, not new or altered behaviour Apple
      has not reviewed. App Store Guideline 3.3.1 permits the former only.
- [ ] `npm run verify` passed on the exact commit being published.
- [ ] The target `version` in `app.config.ts` matches the `version` of the
      builds meant to receive it. `runtimeVersion` uses the `appVersion`
      policy, so bumping `version` starts a new runtime and every build on the
      old one silently stops receiving updates.

**Publishing**

```
eas update --branch <branch> --message "<what and why>"
```

Channels are set per build profile in `eas.json`: `production` builds listen on
`production`, both development profiles on `development`, and `e2e-test` on
none — a test build must not pull a bundle mid-run.

**After**

- [ ] Verified on a device that took the update, not only on the publishing
      machine. `fallbackToCacheTimeout: 0` means an update is fetched in the
      background and applied on the *next* launch, so the first relaunch after
      publishing proves nothing.
- [ ] Rollback path confirmed: `eas update:republish` to the last good update,
      which travels the same way and just as fast.
- [ ] The same fix is in `main`, so the next binary does not regress it.

## Evidence template

| Field                        | Value                  |
| ---------------------------- | ---------------------- |
| Release                      |                        |
| Commit SHA                   |                        |
| Latest migration             |                        |
| Hosted Supabase project      | `qpicjsjxdblrxdrdibge` |
| EAS build ID / build number  |                        |
| Verification timestamp (UTC) |                        |
| Operator                     |                        |
| Static result                |                        |
| Ephemeral DB result          |                        |
| Hosted verification result   |                        |
| Device result                |                        |
| Production result            |                        |
| Baseline diff                |                        |
| Rollback trigger / owner     |                        |
| Issues accepted              |                        |
