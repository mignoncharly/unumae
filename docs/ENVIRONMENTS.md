# Environments

Unumae uses four execution environments across two hosted Supabase projects.
Development and CI are disposable local stacks; staging and production are
separate hosted projects.

| Environment | Database | Permitted use |
| --- | --- | --- |
| Development | `supabase start`, one stack per developer | Migration authoring, seeds, ordinary testing |
| CI | Fresh Supabase CLI stack in Docker | Empty-database migrations and automated integration tests |
| Staging | Hosted Project A | Provider, device, cron, migration, and release-candidate verification |
| Production | Hosted Project B (`qpicjsjxdblrxdrdibge`) | Production traffic only |

The second hosted project must be allocated to staging before any hosted
promotion. It must never become a shared development database.

## Hard boundaries

- Root `.env` is local development only and points to `127.0.0.1:54321`.
- CI starts its own local stack and receives no hosted credentials.
- GitHub Environments named `staging` and `production` hold separate project
  refs, database passwords, access tokens, Edge secrets, and approval rules.
- `scripts/verify-promotion-target.mjs` refuses local promotion, refuses a
  staging target equal to production, and refuses an unapproved production ref.
- `.github/workflows/promote.yml` checks out a full SHA and requires a successful
  `CI` run for that exact SHA before applying migrations or Edge Functions.
- No manual production SQL and no local production function deployment.
- Production administrators require MFA and least-privilege access. GitHub
  production environment approval must have no administrator bypass.

## Mobile builds

Cloud development, simulator, E2E, and staging profiles all use the EAS
`staging` environment. Only the production profile uses EAS `production`.
`app.config.ts` rejects a staging build aimed at the production project and a
production build aimed anywhere else.

Configure public client values separately:

```bash
eas env:create staging --name EXPO_PUBLIC_SUPABASE_URL --value https://<staging-ref>.supabase.co --visibility plaintext
eas env:create staging --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <staging-publishable-key> --visibility plaintext
eas env:create staging --name EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER --value <staging-number> --visibility plaintext
eas env:create production --name EXPO_PUBLIC_SUPABASE_URL --value https://qpicjsjxdblrxdrdibge.supabase.co --visibility plaintext
eas env:create production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <production-publishable-key> --visibility plaintext
eas env:create production --name EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER --value <production-number> --visibility plaintext
```

These three values are public by design. Service-role, provider, signing, and
database credentials never receive an `EXPO_PUBLIC_` prefix.

## Promotion order

1. Author and test against local development.
2. CI reconstructs and tests a fresh local database.
3. Run `Promote hosted environment` for staging using the exact CI-passed SHA.
4. Complete staging provider, physical-device, deletion, cycle, and alert tests.
5. Approve the same SHA for production in the protected GitHub Environment.
6. Capture migration/function evidence and monitor the next daily cycle.

Seed moderators after signup through the audited operator RPCs in
`docs/MODERATION.md`; no future migration contains a personal email address.
