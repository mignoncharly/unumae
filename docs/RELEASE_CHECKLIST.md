# Release checklist

This checklist implements the verification layers required by Phase 0 of
`docs/implementation-roadmap-v2.md`. A release record names the exact commit,
migration, build, environment, date, operator, result, and evidence location.

Public beta is blocked until roadmap Phases 1–5 are complete. Production
traffic is additionally blocked by the paid-plan gate.

## 1. Local static verification

- [ ] Working tree contains only reviewed release changes.
- [ ] `npm ci` completed from the committed lockfile.
- [ ] `npm run verify` passed.
- [ ] `npx expo-doctor` passed all checks.
- [ ] `npm --prefix website run verify` passed.
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

## 3. Staging verification

The current topology has no dedicated Unumae staging project. Phase 10 creates
it from the second hosted-project slot. Until then, these boxes cannot be
truthfully checked and public beta remains blocked.

- [ ] CI promoted the exact tested migration set to staging.
- [ ] Staging migrations match the release commit.
- [ ] Edge Function deployment versions match the release record.
- [ ] Auth, storage, cron, and secret names match the approved baseline.
- [ ] Draw, safety, privacy, memory, deletion, and full-cycle suites passed.
- [ ] Failed jobs and synthetic data were cleaned up.
- [ ] Promotion approval names the exact evidence and commit SHA.

## 4. EAS and native-device verification

- [ ] The release-candidate workflow checked out a full commit SHA and proved a
      successful `CI` run exists for that exact SHA.
- [ ] The build commit passed static, database, and staging verification.
- [ ] `eas config --platform ios --profile production` is correct.
- [ ] Only expected public Supabase client variables are loaded.
- [ ] A new immutable iOS build number and EAS build ID are recorded.
- [ ] Maestro simulator checks passed on small, regular, and large iPhones.
- [ ] The recorded EAS/Maestro workflow used the same checked-out commit SHA.
- [ ] Every applicable real-device and accessibility item in
      `docs/IOS_RELEASE_VERIFICATION.md` passed.
- [ ] Native auth, push, export, deletion, sharing, offline recovery, and
      account switching were exercised on physical hardware.
- [ ] App Store privacy answers and manifest match released behavior.

## 5. Production promotion

- [ ] Roadmap Phases 1–5 are complete for public beta.
- [ ] Paid-plan gate is met before production traffic.
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

## Evidence template

| Field                        | Value                  |
| ---------------------------- | ---------------------- |
| Release                      |                        |
| Commit SHA                   |                        |
| Latest migration             |                        |
| Staging project              |                        |
| Production project           | `qpicjsjxdblrxdrdibge` |
| EAS build ID / build number  |                        |
| Verification timestamp (UTC) |                        |
| Operator                     |                        |
| Static result                |                        |
| Ephemeral DB result          |                        |
| Staging result               |                        |
| Device result                |                        |
| Production result            |                        |
| Baseline diff                |                        |
| Rollback trigger / owner     |                        |
| Issues accepted              |                        |
