# Environments

Unumae uses disposable local databases for ordinary development and CI, plus
one hosted Supabase project for hosted verification and eventual production.
There is no staging Supabase project and no staging EAS environment.

| Context | Database | Permitted use |
| --- | --- | --- |
| Development | `supabase start`, one stack per developer | Migration authoring, seeds, ordinary testing |
| CI | Fresh Supabase CLI stack in Docker | Empty-database migrations and automated integration tests |
| Hosted | Project `qpicjsjxdblrxdrdibge` | Controlled provider/device verification and production traffic |

The single-project decision means hosted verification touches production-bound
infrastructure. It must use synthetic accounts, bounded probes, explicit
cleanup, and the protected workflow. Destructive failure injection remains
local unless an operator has designed a recoverable hosted test and confirmed a
fresh backup.

## Hard boundaries

- Root `.env` defaults to the local stack at `127.0.0.1:54321`.
- CI starts its own local stack and receives no hosted credentials.
- The GitHub Environment named `production` holds the one hosted project ref,
  database password, access token, service credential, and approval rules.
- `scripts/verify-promotion-target.mjs` refuses non-CI deployment and refuses
  any project ref other than the approved hosted project.
- `.github/workflows/promote.yml` checks out a full SHA, requires successful CI
  for that exact revision, and captures sanitized baselines before and after
  applying migrations and Edge Functions.
- Because the direct database hostname is IPv6-only, hosted baselines use the
  password-free linked session-pooler URL in `SUPABASE_DB_POOLER_URL`. The
  script validates its Supabase host, port, username, database, and project ref
  before connecting.
- No manual hosted SQL and no local hosted function deployment.
- Hosted administrators require MFA and least privilege. GitHub production
  approval must have no administrator bypass.
- Secret values never enter repository files, build logs, release evidence, or
  chat. Only secret names and sanitized digests may be recorded.

## Mobile builds

There is one EAS project and one hosted EAS variable environment: `production`.
The `development`, `development-simulator`, and `e2e-test` build profiles read
that variable set but declare `APP_ENV=hosted`, so they remain distinguishable
from an App Store production build. The `production` profile declares
`APP_ENV=production`. Both modes must resolve to the same approved Supabase
project; ordinary local development still uses `APP_ENV=development`.

Configure the public client values once:

```bash
eas env:create production --name EXPO_PUBLIC_SUPABASE_URL --value https://qpicjsjxdblrxdrdibge.supabase.co --visibility plaintext
eas env:create production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <hosted-publishable-key> --visibility plaintext
```

These values are public by design. Service-role, provider, signing, and database
credentials never receive an `EXPO_PUBLIC_` prefix. Android-only variables are
deferred with the Android release; see `docs/POST_IOS_ANDROID.md`.

## Hosted deployment order

1. Author and test against local development.
2. CI reconstructs and tests a fresh local database.
3. Create or confirm a current recoverable backup when the change warrants it.
4. Run `Deploy hosted environment` for the exact CI-passed SHA.
5. Review the pre/post sanitized baseline and migration/function versions.
6. Run bounded hosted verification with synthetic accounts and clean it up.
7. Monitor alerts and the next relevant daily cycle.

Seed moderators after signup through the audited operator RPCs in
`docs/MODERATION.md`; no future migration contains a personal email address.
