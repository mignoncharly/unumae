# Environment

> Phase 0 note, 25 August 2026: this file describes the current topology, not
> the roadmap target. `docs/implementation-roadmap-v2.md` supersedes the
> one-hosted-project design for release planning: development and CI move to
> isolated local stacks, while the two available hosted slots are reserved for
> staging and production. Until Phase 10 is complete, there is still only one
> Unumae hosted project and therefore no safe staging promotion step.

**One Supabase project. One EAS project. One bundle identifier.**

Decided 2026-08-22, superseding the three-environment design in earlier
revisions of this file.

## The setup

| Thing | Value |
| --- | --- |
| Supabase project | `qpicjsjxdblrxdrdibge` |
| EAS project | `@mignoncharly/unumae` (`75cfb922-5d90-4436-965d-e67672558ed3`) |
| iOS bundle identifier | `com.unumae.app` |
| Deep link scheme | `onehuman://` |
| Apple Team ID | `UB67843RJK` |

There is no `APP_ENV`, no staging project, and no `.dev` or `.staging` bundle
suffix. Configuration that pretends to separate environments while pointing at
one database is worse than no separation at all: it reads as a safeguard and
is not one.

## What this costs, stated plainly

Since development and production are the same database:

- **A destructive migration is immediately live.** Migrations are append-only
  and additive, and `npm run verify` checks them before they are applied, but
  there is no rehearsal step. Read a migration twice before `npm run db:push`.
- **Test data becomes real data.** Anything created while trying something out
  is in the same tables as everything else. `supabase/seed.sql` therefore stays
  empty of anything that could be mistaken for a person.
- **There is no safe place to break things.** Schema experiments happen against
  the live project, so prefer a scratch table you drop over altering a real one.

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
npm run verify:live      # draw cross-check + anonymous access probe

npx supabase functions deploy delete-account --project-ref qpicjsjxdblrxdrdibge
eas build --profile development --platform ios
```
