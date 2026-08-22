# Open items

Who owns what, so nothing is forgotten between sessions. Updated at the end of
each phase. Anything with a ⚠️ blocks a real cycle from running.

Last updated: end of Phase 5.

---

## Yours — needs a human, an account, or a credential I do not hold

| # | Item | Why it needs you | Blocks |
| --- | --- | --- | --- |
| 1 | ⚠️ **Enable Apple as a Supabase auth provider** | Dashboard → Authentication → Providers → Apple. Needs a Service ID, Key ID and private key from your Apple Developer account. | Sign in with Apple on device. Email code works without it. |
| 2 | ⚠️ **Deploy the delete-account Edge Function** | `npx supabase functions deploy delete-account --project-ref qpicjsjxdblrxdrdibge`. Needs a personal access token I do not have. | Account deletion, and App Store review. |
| 3 | ⚠️ **Separate Supabase projects for staging and production** | One project is currently used for all three environments, so a test run could destroy real data. Create two more and put their keys in the EAS environment. | Safe testing once there is real data. |
| 4 | **Move `docs/supa_keys.md` out of the repo** | It holds the service-role key, the database password and the JWT secret. Gitignored and never committed, but one `git add -f` away from being public. Suggested: `C:\Users\migno\.onehuman\`. | Nothing, until it leaks. |
| 5 | **`eas login` and `eas init`** | Links the project id. Then `eas build --profile development --platform ios` produces the iOS development build Phase 1 could not. | Running the app on a real device. |
| 6 | **Decide the verification bar for `selection_eligible`** | Article 8.5 says device signals, optional phone, liveness on selection. Which of those you actually want at launch is a product decision, not a technical one. | Anyone becoming eligible at all. |
| 7 | **Write the community rules text** | `accepted_rules_at` exists and gates eligibility, but there is no document to accept yet. | Anyone becoming eligible at all. |

## Mine — code, and already planned

| # | Item | Phase |
| --- | --- | --- |
| 1 | Human Portrait Builder: guided prompts, 5–7 elements, photo upload | 6 — next |
| 2 | `avatars` and portrait storage buckets with RLS | 6 |
| 3 | Community-rules acceptance flow, once you supply the text (Yours #7) | 6 |
| 4 | Moderation queue and the `content_review` → `ready` transition | 9 |
| 5 | Today's Human screen, questions, voting, Remember | 7 |
| 6 | Push notifications — the invitation currently only appears in-app | 10 |
| 7 | Admin console for the daily queue and portrait review | 9 |

## Done and verified against the live project

- Draw is reproducible, and cross-checked against a second implementation
  (`npm run verify:draw`).
- No privileged function or table is reachable anonymously
  (`npm run verify:privileges`).
- `pg_cron` drives the cycle: draw at 00:00 UTC for D+2, notify at 00:10,
  expiry sweep every 15 minutes.
- 228 tests, and a pre-push hook that runs them.

## Commands worth remembering

```bash
npm run verify          # typecheck, lint, format, migrations, tests — offline
npm run verify:live     # draw cross-check + anonymous access probe — needs network
npm run db:push         # apply pending migrations
npm run db:list         # what is applied where
```
