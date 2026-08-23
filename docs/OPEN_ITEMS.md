# Open items

Who owns what, so nothing is forgotten between sessions. Updated at the end of
each phase. ⚠️ blocks a real cycle from running.

Last updated: end of Phase 15.

---

## Yours — needs a human, an account, or a decision only you can make

| # | Item | Why it needs you | Blocks |
| --- | --- | --- | --- |
| 1 | **Deploy `website/` to `unumae.app`** | The app links out to it for About, Privacy and Terms, and every shared link points there. You are developing it on your own server; until it is live those links go nowhere. | Sharing, and the legal links, being useful. |
| 2 | **A light version of the wordmark**, if you want a dark splash | The icon and splash are in and wired up. The splash is white in both light and dark mode, because the wordmark's darkest ink measures 1.32:1 against `#0B0B0C` — it would be all but invisible. A light wordmark at `assets/splash-dark.png` is the only thing missing. | Nothing. White reads everywhere. |
| 3 | **First iOS development build** | `eas build --profile development --platform ios`. Apple credentials are created interactively on the first run. Nothing else is waiting on it. | Testing Sign in with Apple and push. |
| 4 | **Recruit 10–20 people for the internal alpha** | The simulation proves the machinery works. It cannot tell you whether Today's Human is interesting, whether anyone opens the Archive, or whether anyone shares a portrait unprompted. Only real people answer that. `docs/BETA.md` has the four questions to watch for. | The growth gate, and everything after it. |
| 5 | **Decide the four gate thresholds are right** | D1 25%, D7 10%, participation 15%, share rate 3%. I chose defensible numbers; they are your call, and the point of them is that they are fixed *before* any result exists. Changing them later is legitimate, but it should be a deliberate commit, not a reaction to a disappointing week. | Nothing yet — they bind at step 5 of `docs/BETA.md`. |
| 6 | **Check the share card on a real device** | Settings → Developer → Share card. It names which of the two native modules loaded, renders the card scaled to fit, and captures it to a real PNG that it then displays — the preview proves the layout, only the capture proves the capture. | Nothing — the fallback works. |
| 7 | **Secrets in `docs/supa_keys.md`** | Deferred to the end of the project, as you asked. Gitignored, never committed, and no new credentials have been added to the repository. | Nothing. |

## Mine — code, and already planned

| # | Item | Phase |
| --- | --- | --- |
| 1 | Scale and AI features | 16 — next |
| 2 | Schedule the notification sender and the translation job (both deployed; both need pg_net or an external cron to run nightly) | 16 |
| 3 | Liveness capture flow — the gate exists and is switched off | later, native |
| 4 | Optional audio/video portrait element | later |

## Needs a native build, not Expo Go

Development happens in Expo Go on Android. These work in the code but cannot be
exercised there, and are flagged rather than reworked:

| Feature | Why | State |
| --- | --- | --- |
| Sign in with Apple | Expo Go signs its own bundle, so it cannot carry this app's entitlement | Implemented; hides itself and explains why. Email code works everywhere. |
| Push notifications | Expo Go has no push credentials for this bundle | Built; needs a dev build to test |
| Liveness check | Camera-based SDK, likely a native module | Not built yet |

Everything else — the draw, portraits, questions, voting, Remember, image
picking, storage, the Signals tab — runs in Expo Go.

## Deployed and verified against the live project

| Thing | State |
| --- | --- |
| Supabase project | `qpicjsjxdblrxdrdibge`, CLI linked |
| Migrations | 28 applied |
| Edge Functions | `delete-account`, `send-notifications`, `translate-portraits` — all deployed and probed |
| Storage buckets | `avatars`, `portraits` — both private |
| Scheduled jobs | eligibility 23:50, draw 00:00 for D+2, notify 00:10, publish 00:01, expiry sweep every 15 min, analytics purge 03:30 |
| EAS project | `@mignoncharly/unumae` |
| Apple provider | enabled, `com.unumae.app` confirmed in its Client IDs |
| Moderator bootstrap | seeded by email; promotes automatically on profile creation |
| Draw verification | database and independent implementation agree |
| Anonymous access | 89 checks, matches the allowlist |
| Signed-in privilege escalation | 31 checks, all refused |
| **Full loop, end to end** | **passes — draw, invitation, acceptance, portrait, moderation, publication, audience, Archive** |
| Tests | 492 offline, plus four live suites |

## Commands worth remembering

```bash
npm run verify            # typecheck, lint, format, migrations, tests — offline
npm run verify:live       # draw cross-check + anonymous access probe
npm run verify:security   # attacks the live database as a signed-in user
npm run simulate          # the whole loop in three minutes; cleans up after itself
npm run db:push           # apply pending migrations
npm run db:list           # confirm remote matches local — always check after a push
```

⚠️ Run `npm run simulate` after any migration that touches the draw, the
moderation path, or publication. Two fatal bugs shipped past 465 green tests
because the schema guards read SQL as text and cannot tell you it runs.
