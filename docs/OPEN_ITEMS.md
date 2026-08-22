# Open items

Who owns what, so nothing is forgotten between sessions. Updated at the end of
each phase. ⚠️ blocks a real cycle from running.

Last updated: end of Phase 7.

---

## Yours — needs a human, an account, or a credential I do not hold 

| # | Item | Why it needs you | Blocks |
| --- | --- | --- | --- |
| 1 | ⚠️ **Log the Supabase CLI into the right account, then deploy** | Not a missing token — the CLI here is already logged in, but as an account that can see `cook-or-delete`, `oncewasyours` and `kinavela` and **not** `qpicjsjxdblrxdrdibge`, so the Management API answers 403. Run `npx supabase login` as the account that owns onehuman (or add that account to its organisation), and I can deploy. Migrations are unaffected — `db.mjs` uses the direct Postgres connection, not the Management API. | Deploying any Edge Function. |
| 2 | ⚠️ **Create staging and production Supabase projects** | One project currently serves all three environments. `docs/ENVIRONMENTS.md` has the setup; `app.config.ts` now refuses a non-dev build that has no separate URL. | Safe testing once real data exists. |
| 3 | ⚠️ **App IDs for the dev and staging bundle identifiers** | `com.unumae.app.dev` and `com.unumae.app.staging` each need an App ID with Sign in with Apple enabled, or auth only works in production builds. | Testing Apple auth before release. |
| 4 | **Move `docs/supa_keys.md` out of the repo** | Holds the service-role key, database password and JWT secret. Gitignored, never committed. Suggested: `C:\Users\migno\.onehuman\`. | Nothing, until it leaks. |
| 5 | **`eas login` and `eas init`** | Interactive, so run it yourself — in this session you can type `! eas login`. Then `eas build --profile development --platform ios`. | Running on a real device. |
| 6 | **Review `docs/COMMUNITY_RULES.md`** | Drafted for you. The notes at the bottom list five decisions worth overturning if you disagree — particularly the appeals promise in rule 8, which is a real operational commitment. | Nothing; the text is live in the app already. |
| 7 | **Confirm the product name** | The bundle identifier is `com.unumae.app` and the SKU is `unumae-ios-001`, but every string in the app says ONE HUMAN. If Unumae is the public name, the rename is a half-day of work and should happen before the App Store listing. | The App Store listing. |

## Mine — code, and already planned

| # | Item | Phase |
| --- | --- | --- |
| 1 | Human Archive: Today, Yesterday, One year ago, Random, country, year | 8 — next |
| 2 | Moderation queue, `content_review` → `ready` → `live` transitions | 9 |
| 3 | Liveness verification before publication (`VERIFICATION_POLICY.md`) | 9 |
| 4 | Admin console for the daily queue and portrait review | 9 |
| 5 | Push notifications — the invitation is in-app only today | 10 |
| 6 | Optional audio/video portrait element | later |

## Decided this session

- **Verification bar** (`docs/VERIFICATION_POLICY.md`): email confirmed plus a
  seven-day-old account to enter the pool; liveness only after selection and
  before publication. No phone, no device attestation as a default toll —
  reserved as responses to observed abuse. The one-person-one-account problem
  is explicitly *not* solved, and the document says so rather than pretending.
- **Community rules** (`docs/COMMUNITY_RULES.md`): drafted, live in the app in
  all three languages, awaiting your review.

## Done and verified against the live project

- Draw reproducible, cross-checked against a second implementation
  (`npm run verify:draw`).
- No privileged function or table reachable anonymously
  (`npm run verify:privileges`).
- `pg_cron` drives the cycle: eligibility refresh 23:50, draw 00:00 for D+2,
  notify 00:10, publication 00:01, expiry sweep every 15 minutes.
- 273 tests, and a pre-push hook that runs them.
- Anonymous access probe now covers 26 checks across functions, tables and
  column exposure.

## Commands worth remembering

```bash
npm run verify          # typecheck, lint, format, migrations, tests — offline
npm run verify:live     # draw cross-check + anonymous access probe — needs network
npm run db:push         # apply pending migrations
npm run db:list         # what is applied where
```
