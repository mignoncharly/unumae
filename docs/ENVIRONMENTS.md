# Environments

Three environments, three Supabase projects. Never one project for everything.

## The shape

| `APP_ENV` | App name | Bundle identifier | Scheme | Supabase project |
| --- | --- | --- | --- | --- |
| `development` | ONE HUMAN (Dev) | `com.unumae.app.dev` | `onehuman-dev` | dev project |
| `staging` | ONE HUMAN (Staging) | `com.unumae.app.staging` | `onehuman-staging` | staging project |
| `production` | ONE HUMAN | `com.unumae.app` | `onehuman` | production project |

The production bundle identifier is the one registered in the Apple Developer
account. It is not ours to choose: Sign in with Apple fails if it does not
match exactly. Dev and staging are suffixes so all three install side by side.

**Each bundle identifier needs its own App ID in the Apple Developer account,
with the Sign in with Apple capability enabled**, or auth only works in
production builds.

## Where credentials live

| Environment | Where the Supabase keys come from |
| --- | --- |
| development | `.env`, local, gitignored |
| staging | EAS environment variables, `staging` profile |
| production | EAS environment variables, `production` profile |

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are deliberately
**not** in `eas.json`. That file is committed, and although both values are
public by design, putting them there makes it far too easy to point a
production build at the wrong project by editing the wrong line.

```bash
eas env:create --environment production \
  --name EXPO_PUBLIC_SUPABASE_URL --value https://<prod-ref>.supabase.co
eas env:create --environment production \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <prod publishable key>
```

## The guard

`app.config.ts` refuses to configure a staging or production build that has no
`EXPO_PUBLIC_SUPABASE_URL`, or whose URL matches `DEVELOPMENT_SUPABASE_URL`.

That second check is the one that matters. A production build pointed at the
development database looks completely normal until a test run destroys real
data. Set `DEVELOPMENT_SUPABASE_URL` in the EAS environment for staging and
production so the guard has something to compare against.

## Applying migrations to each project

`scripts/db.mjs` reads the credential file for the project it should target.
Point `CREDENTIALS_FILE` at the right one:

```bash
CREDENTIALS_FILE=~/.onehuman/dev.md      npm run db:push
CREDENTIALS_FILE=~/.onehuman/staging.md  npm run db:push
CREDENTIALS_FILE=~/.onehuman/prod.md     npm run db:push
```

Migrations are append-only and applied in the same order everywhere, so the
three schemas stay identical. Anything applied to production must have been
applied to staging first.

## Current state

Only the development project exists. Until staging and production are created,
all three `APP_ENV` values would reach the same database — which is why the
guard exists and why creating the other two projects is tracked in
`docs/OPEN_ITEMS.md`.
