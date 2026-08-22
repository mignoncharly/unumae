# Open items

Who owns what, so nothing is forgotten between sessions. Updated at the end of
each phase. ⚠️ blocks a real cycle from running.

Last updated: end of Phase 7.

---

## Yours — needs a human, an account, or a decision only you can make

| # | Item | Why it needs you | Blocks |
| --- | --- | --- | --- |
| 1 | **First iOS development build** | `eas build --profile development --platform ios`. Apple credentials are created interactively on the first run. You said you will run it later — nothing else is waiting on it. | Testing Sign in with Apple. |
| 2 | **Secrets in `docs/supa_keys.md`** | Deferred to the end of the project, as you asked. Gitignored, never committed, and no new credentials have been added to the repository. | Nothing. |

## Mine — code, and already planned

| # | Item | Phase |
| --- | --- | --- |
| 1 | Moderation queue and admin console | 9 — next |
| 2 | Liveness verification before publication (`VERIFICATION_POLICY.md`) | 9 |
| 3 | Push notifications — the invitation is in-app only today | 10 |
| 4 | Optional audio/video portrait element | later |

## Needs a native build, not Expo Go

Development happens in Expo Go on Android. These work in the code but cannot be
exercised there, and are flagged rather than reworked:

| Feature | Why | State |
| --- | --- | --- |
| Sign in with Apple | Expo Go signs its own bundle, so it cannot carry this app's entitlement | Implemented; hides itself and explains why. Email code works everywhere. |
| Push notifications (Phase 10) | Expo Go has no push credentials for this bundle | Not built yet |
| Liveness check (Phase 9) | Camera-based SDK, likely a native module | Not built yet |

Everything else — the draw, portraits, questions, voting, Remember, image
picking, storage — runs in Expo Go.

## Deployed and verified against the live project

| Thing | State |
| --- | --- |
| Supabase project | `qpicjsjxdblrxdrdibge`, CLI linked |
| Migrations | 14 applied |
| Edge Functions | `delete-account` deployed; rejects no-auth 401, anon-key 401, GET 405 |
| Storage buckets | `avatars`, `portraits` — both private |
| Scheduled jobs | eligibility 23:50, draw 00:00 for D+2, notify 00:10, publish 00:01, expiry sweep every 15 min |
| EAS project | `@mignoncharly/unumae` |
| Apple provider | enabled, `com.unumae.app` confirmed in its Client IDs |
| Community rules | approved as written, live in EN/FR/DE |
| Draw verification | database and independent implementation agree |
| Anonymous access | 32 checks, matches the allowlist |
| Tests | 306, with a pre-push hook |

## Commands worth remembering

```bash
npm run verify          # typecheck, lint, format, migrations, tests — offline
npm run verify:live     # draw cross-check + anonymous access probe — needs network
npm run db:push         # apply pending migrations
npx supabase functions deploy delete-account --project-ref qpicjsjxdblrxdrdibge
eas build --profile development --platform ios
```
