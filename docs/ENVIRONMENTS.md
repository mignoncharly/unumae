# Environment

> Phase 3 update, 25 August 2026: development and CI now use isolated local
> Supabase stacks. The only hosted Unumae project is production; the second
> hosted slot remains reserved for staging in Phase 10. There is therefore a
> fresh-database CI gate, but still no safe hosted staging promotion step.

**One hosted Supabase project today. Ephemeral local development and CI. One
EAS project and bundle identifier.**

The target topology is local development, disposable local CI, hosted staging,
and hosted production. Staging is the only missing environment.

## The setup

| Thing | Value |
| --- | --- |
| Supabase project | `qpicjsjxdblrxdrdibge` |
| EAS project | `@mignoncharly/unumae` (`75cfb922-5d90-4436-965d-e67672558ed3`) |
| iOS bundle identifier | `com.unumae.app` |
| Deep link scheme | `onehuman://` |
| Apple Team ID | `UB67843RJK` |

There is no hosted staging project yet and no `.dev` or `.staging` bundle
suffix. Local Supabase credentials are discovered from `supabase status`; CI
never receives hosted database credentials.

## What this costs, stated plainly

For any command explicitly aimed at the hosted project:

- **A destructive migration is immediately live.** Migrations are append-only
  and additive, and `npm run verify` checks them before they are applied, but
  there is no rehearsal step. Read a migration twice before `npm run db:push`.
- **Test data becomes real data.** Hosted verification must be deliberate and
  self-cleaning. Ordinary development and all CI integration tests stay local.
- **There is still no hosted rehearsal.** The local stack proves migrations and
  contracts from empty, but cannot prove provider configuration or hosted-plan
  behavior. Phase 10 staging remains a release blocker.

These are accepted, not overlooked. If the project later needs a rehearsal
environment, the migration pipeline already supports it — `scripts/db.mjs`
reads `CREDENTIALS_FILE`, so a second project is a credential file away.

## Configuration

`.env`, gitignored, local only:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://qpicjsjxdblrxdrdibge.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
```

For EAS builds the same two values are set as plaintext EAS environment
variables rather than committed. They are configured for both `development`
and `production`; `eas.json` explicitly selects the matching environment for
each build profile:

```bash
eas env:create development --name EXPO_PUBLIC_SUPABASE_URL --value https://qpicjsjxdblrxdrdibge.supabase.co --visibility plaintext
eas env:create development --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <publishable key> --visibility plaintext
eas env:create production --name EXPO_PUBLIC_SUPABASE_URL --value https://qpicjsjxdblrxdrdibge.supabase.co --visibility plaintext
eas env:create production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <publishable key> --visibility plaintext
```

The anon key is public by design — it is safe in the client only because Row
Level Security is enabled on every table. It stays out of the repository
anyway, because a key in a repository is a key you cannot rotate quietly.

## Platform

iOS first. The Android block in `app.config.ts` exists so the project stays
cross-platform — nothing in `src/` is iOS-only by construction — but no Android
work is done, and none should be started before the iOS product is real.

## Commands

```bash
npm run db:push          # apply pending migrations to the project
npm run db:list          # what is applied
npm run verify:integration # local draw, role and RLS probes
npm run simulate           # complete local daily-cycle integration
npm run verify:live        # explicit hosted draw, role and RLS probes

npx supabase functions deploy delete-account --project-ref qpicjsjxdblrxdrdibge
eas build --profile development --platform ios
```
