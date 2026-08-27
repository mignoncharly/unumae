# Phase B — hosted infrastructure baseline

Status: **Complete** on 27 August 2026.

Unumae uses one hosted Supabase project and one EAS project. No staging
project, staging services, or staging promotion path exists.

## Verified baseline

- Protected deployment target: the GitHub Environment named `production`.
- Approved Supabase project: `qpicjsjxdblrxdrdibge`.
- Exact deployed `main` revision:
  `521257678bb388dccf1418b1002ea2ed694b6ed0`.
- All 52 repository migrations match the hosted migration history; the latest
  migration is `20260826120000`.
- All 11 repository Edge Functions are deployed and `ACTIVE`, with no missing
  or extra hosted functions.
- Every Edge Function route returned a successful CORS preflight response.
- Auth, database, and Storage health checks pass.
- Both Storage buckets, `avatars` and `portraits`, are private, JPEG-only, and
  limited to 8 MiB per object. Eight Storage object policies are present.
- All 48 public tables have row-level security enabled.
- All 16 scheduled jobs are active.
- The scheduled-function URL and service-role credential exist in Vault. Only
  their secret names were inspected.
- Required iOS/provider secret names are present, including Resend, DeepL,
  App Attest/DeviceCheck configuration, `APPLE_DEVICECHECK_KEY_ID`, and
  `APPLE_DEVICECHECK_PRIVATE_KEY`. No secret value was captured or printed.
- The EAS project is `@mignoncharly/unumae`, project ID
  `75cfb922-5d90-4436-965d-e67672558ed3`; the configured `EXPO_TOKEN`
  authenticates as the project owner.
- The iOS bundle identifier remains `com.unumae.app`.

## Evidence

- Exact-SHA CI: GitHub Actions run `33053614876`.
- Exact-SHA hosted deployment: GitHub Actions run `33111119975`.
- Post-DeviceCheck hosted health: GitHub Actions run `33114280283`.
- Sanitized post-deployment baseline: 52 migrations, 48 RLS-protected public
  tables, two private buckets, eight Storage policies, and 16 active cron jobs.

The protected deployment workflow validates the exact CI-passed SHA and the
approved project before applying forward migrations, rotating scheduled-job
credentials, or deploying functions. It captures sanitized baselines before
and after deployment.

## Remaining boundaries

- Genuine App Attest/DeviceCheck evidence still requires a signed build on a
  physical iPhone and belongs to the deferred native portion of Phase D.
- Scheduled backup observation and a timed restore rehearsal belong to Phase E
  operational safety; they are not part of this infrastructure-baseline exit.
- Android remains deferred to `docs/POST_IOS_ANDROID.md`.

## Exit decision

The single hosted Supabase/EAS environment is correctly configured,
reproducible where practical, and usable for bounded hosted verification.
Phase B is complete. Phase C — hosted verification of Phases 1–6 — is next.
