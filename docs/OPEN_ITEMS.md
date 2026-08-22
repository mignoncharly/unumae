# Open items

Who owns what, so nothing is forgotten between sessions. Updated at the end of
each phase. ⚠️ blocks a real cycle from running.

Last updated: end of Phase 7.

---

## Yours — needs a human, an account, or a decision only you can make

| # | Item | Why it needs you | Blocks |
| --- | --- | --- | --- |
| 1 | ⚠️ **Re-authenticate the Supabase CLI, so I can deploy `send-notifications`** | The CLI worked earlier this session and has since reverted to an account that cannot see `qpicjsjxdblrxdrdibge` — `supabase projects list` now shows `cook-or-delete`, `oncewasyours`, `kinavela` instead of `onehuman`, and the Management API answers 403. `npx supabase login` as the owning account fixes it. Migrations are unaffected: `db.mjs` uses the direct Postgres connection. | Deploying `send-notifications`. |
| 2 | **First iOS development build** | `eas build --profile development --platform ios`. Apple credentials are created interactively on the first run. You said you will run it later — nothing else is waiting on it. | Testing Sign in with Apple and push. |
| 3 | **Appoint the first moderator** | `public.moderators` is service-role only by design — no client can grant moderation authority. Insert your own profile id there from the Supabase SQL editor once you have signed up, or ask me and I will run it. Until then the moderation queue is unreachable and no portrait can be approved. | Any cycle going live. |
| 4 | **Secrets in `docs/supa_keys.md`** | Deferred to the end of the project, as you asked. Gitignored, never committed, and no new credentials have been added to the repository. | Nothing. |

## Mine — code, and already planned

| # | Item | Phase |
| --- | --- | --- |
| 1 | Analytics, share cards, deep links, landing page | 11 — next |
| 2 | A translation job to fill portrait_element_translations | later |
| 3 | Liveness capture flow — the gate exists and is switched off | later, native |
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
| Migrations | 18 applied |
| Edge Functions | `delete-account` deployed and probed. `send-notifications` written but NOT deployed — see Yours #1 |
| Storage buckets | `avatars`, `portraits` — both private |
| Scheduled jobs | eligibility 23:50, draw 00:00 for D+2, notify 00:10, publish 00:01, expiry sweep every 15 min |
| Notification sending | not scheduled — needs the function deployed, then a cron calling it |
| EAS project | `@mignoncharly/unumae` |
| Apple provider | enabled, `com.unumae.app` confirmed in its Client IDs |
| Community rules | approved as written, live in EN/FR/DE |
| Draw verification | database and independent implementation agree |
| Anonymous access | 69 checks, matches the allowlist |
| Tests | 355, with a pre-push hook |

## Commands worth remembering

```bash
npm run verify          # typecheck, lint, format, migrations, tests — offline
npm run verify:live     # draw cross-check + anonymous access probe — needs network
npm run db:push         # apply pending migrations
npx supabase functions deploy delete-account --project-ref qpicjsjxdblrxdrdibge
eas build --profile development --platform ios
```
