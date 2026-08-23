# Open items

Who owns what, so nothing is forgotten between sessions. Updated at the end of
each phase. ⚠️ blocks a real cycle from running.

Last updated: end of Phase 7.

---

## Yours — needs a human, an account, or a decision only you can make

| # | Item | Why it needs you | Blocks |
| --- | --- | --- | --- |
| 1 | **Deploy `website/` to `unumae.app`** | The app links out to it for About, Privacy and Terms, and every shared link points there. You are developing it on your own server; until it is live those links go nowhere. `npm run web:build` produces the static site. | Sharing, and the legal links, being useful. |
| 2 | **App icon and launch screen** | 1024x1024, no transparency, no rounded corners; and the wordmark for the launch screen. Design decisions, not generated placeholders. docs/APP_STORE.md says where they go once they exist. | App Store submission. |
| 3 | **First iOS development build** | `eas build --profile development --platform ios`. Apple credentials are created interactively on the first run. You said you will run it later — nothing else is waiting on it. | Testing Sign in with Apple and push. |
| 4 | ~~Appoint the first moderator~~ **— solved, nothing to do** | `charles.nguenkam@gmail.com` and `mignoncharly@yahoo.fr` are seeded in `public.founding_moderators`. Whichever you sign up with, a trigger promotes you to moderator the moment you finish onboarding, and the migration backfilled anyone who already had a profile. Full detail, including how to add and remove moderators later: `docs/MODERATION.md`. | Nothing. |
| 5 | **Secrets in `docs/supa_keys.md`** | Deferred to the end of the project, as you asked. Gitignored, never committed, and no new credentials have been added to the repository. | Nothing. |

## Mine — code, and already planned

| # | Item | Phase |
| --- | --- | --- |
| 1 | Internal Alpha and Private Beta | 14 — next |
| 2 | Schedule the notification sender (needs pg_net or an external cron) | 14 |
| 3 | A translation job to fill `portrait_element_translations` | later |
| 4 | Liveness capture flow — the gate exists and is switched off | later, native |
| 5 | Optional audio/video portrait element | later |

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
| Migrations | 22 applied |
| Edge Functions | `delete-account` deployed and probed. `send-notifications` written but NOT deployed — see Yours #1 |
| Storage buckets | `avatars`, `portraits` — both private |
| Scheduled jobs | eligibility 23:50, draw 00:00 for D+2, notify 00:10, publish 00:01, expiry sweep every 15 min |
| Notification sending | deployed; requires the service role. Not yet scheduled — a cron must call it |
| EAS project | `@mignoncharly/unumae` |
| Apple provider | enabled, `com.unumae.app` confirmed in its Client IDs |
| Moderator bootstrap | seeded by email; promotes automatically on profile creation |
| Community rules | approved as written, live in EN/FR/DE |
| Draw verification | database and independent implementation agree |
| Anonymous access | 78 checks, matches the allowlist |
| Signed-in privilege escalation | 31 checks, all refused (`npm run verify:security`) |
| Tests | 465 offline, plus three live suites |

## Commands worth remembering

```bash
npm run verify          # typecheck, lint, format, migrations, tests — offline
npm run verify:live     # draw cross-check + anonymous access probe — needs network
npm run db:push         # apply pending migrations
npx supabase functions deploy delete-account --project-ref qpicjsjxdblrxdrdibge
eas build --profile development --platform ios
```
