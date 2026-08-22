# Open items

Who owns what, so nothing is forgotten between sessions. Updated at the end of
each phase. ⚠️ blocks a real cycle from running.

Last updated: end of Phase 7.

---

## Yours — needs a human, an account, or a decision only you can make

| # | Item | Why it needs you | Blocks |
| --- | --- | --- | --- |
| 1 | ⚠️ **Confirm `com.unumae.app` is in the Apple provider's Client IDs** | Supabase → Authentication → Providers → Apple. The provider is enabled, but native Sign in with Apple sends an identity token whose audience is the **bundle id**, and Supabase rejects it unless that exact string is listed there. The dashboard is the only place to check it. | Apple sign-in on device. |
| 2 | ⚠️ **First iOS build, and sign-in on a real device** | `eas build --profile development --platform ios`. Apple credentials are created interactively on the first run. Sign in with Apple cannot be tested in a simulator or on web. | Verifying auth end to end. |
| 3 | **Confirm the display name** | Bundle `com.unumae.app`, SKU `unumae-ios-001`, EAS project `unumae` — but every string in the app still says ONE HUMAN. I left the strings alone: renaming is a product decision, not an inference from an identifier. Half a day if you want it. | The App Store listing. |
| 4 | **Review `docs/COMMUNITY_RULES.md`** | Drafted and live in all three languages. The notes at the bottom list five decisions worth overturning — particularly the appeals promise in rule 8, which is a real operational commitment. | Nothing. |
| 5 | **Secrets in `docs/supa_keys.md`** | Deferred to the end of the project, as you asked. Gitignored, never committed, and no new credentials have been added to the repository. | Nothing. |

## Mine — code, and already planned

| # | Item | Phase |
| --- | --- | --- |
| 1 | Human Archive: Today, Yesterday, One year ago, Random, country, year | 8 — next |
| 2 | Moderation queue and admin console | 9 |
| 3 | Liveness verification before publication (`VERIFICATION_POLICY.md`) | 9 |
| 4 | Push notifications — the invitation is in-app only today | 10 |
| 5 | Optional audio/video portrait element | later |

## Deployed and verified against the live project

| Thing | State |
| --- | --- |
| Supabase project | `qpicjsjxdblrxdrdibge`, CLI linked |
| Migrations | 13 applied |
| Edge Functions | `delete-account` deployed; rejects no-auth 401, anon-key 401, GET 405 |
| Storage buckets | `avatars`, `portraits` — both private |
| Scheduled jobs | eligibility 23:50, draw 00:00 for D+2, notify 00:10, publish 00:01, expiry sweep every 15 min |
| EAS project | `@mignoncharly/unumae` |
| Apple provider | enabled on the hosted project |
| Draw verification | database and independent implementation agree |
| Anonymous access | 26 checks, matches the allowlist |
| Tests | 273, with a pre-push hook |

## Commands worth remembering

```bash
npm run verify          # typecheck, lint, format, migrations, tests — offline
npm run verify:live     # draw cross-check + anonymous access probe — needs network
npm run db:push         # apply pending migrations
npx supabase functions deploy delete-account --project-ref qpicjsjxdblrxdrdibge
eas build --profile development --platform ios
```
