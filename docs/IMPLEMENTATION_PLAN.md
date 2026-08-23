# Implementation plan

The 42 phases of the original plan, regrouped into 18 without losing any content
(`prompt-18.md` at the repository root carries the full text; `prompt.md` is the
original). This file tracks status only.

| # | Phase | Status | Launch blocker |
| --- | --- | --- | --- |
| 0 | Product Constitution | ✅ done | ✅ |
| 1 | Foundation & project architecture | ✅ done | ✅ |
| 2 | Design system + UX prototype | ✅ done | ✅ |
| 3 | Authentication & user profile | ✅ done | ✅ |
| 4 | Eligibility & daily selection engine | ✅ done | ✅ |
| 5 | Fairness, transparency & candidate notification | ✅ done | ✅ |
| 6 | Human Portrait Builder | ✅ done | ✅ |
| 7 | Today's Human experience | ✅ done | ✅ |
| 8 | Human Archive, discovery & One Year Ago | ✅ done | ✅ |
| 9 | Trust & safety | ✅ done | ✅ |
| 10 | Notifications, localization & translation | ✅ done | ✅ |
| 11 | Analytics, sharing & landing web | ✅ done | ✅ |
| 12 | Accessibility & offline | ✅ done | ✅ |
| 13 | Testing & App Store readiness | ✅ done | ✅ |
| 14 | Internal Alpha, Private Beta & retention | ⬜ next | ✅ |
| 15 | Viral experiments & 1,000 users | ⬜ | ✅ |
| 16 | Scale & AI features | ⬜ | ❌ post-launch |
| 17 | Monetization, Android & full web/PWA | ⬜ | ❌ post-launch |

## Phase 0 — Product Constitution ✅

`docs/PRODUCT_CONSTITUTION.md`. Thirteen non-negotiables plus one, an
unamendable Article 1, and twelve parameters fixed in Appendix B. Decisions
taken: one global 00:00 UTC cycle, minimum age 16, no re-selection ever, Quiet
Day when a cycle cannot be filled.

## Phase 1 — Foundation ✅

Delivered:

- Expo SDK 57 · React Native 0.86 · React 19 · TypeScript strict
- Expo Router with Today / Archive / Settings, plus `(auth)` and `dev/tokens`
- Theme tokens (colors, spacing, radius, typography, shadows, motion,
  breakpoints) with light and dark palettes
- i18n in EN / FR / DE, no hardcoded UI strings, canonical English
- Supabase client with a connection probe surfaced in Settings
- TanStack Query, Zustand (persisted preferences), Zod validation
- Three environments driven by `APP_ENV`, credentials validated at import
- `npm run verify` and a pre-push hook standing in for CI
- 54 tests across five suites
- `docs/ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`

Phase 1 "done" criteria from the plan:

| Criterion | Status |
| --- | --- |
| Start the app | ✅ `npm start` |
| Navigate | ✅ three tabs + stack routes |
| Change the language | ✅ Settings → Language, persisted |
| Display theme tokens | ✅ Settings → Design tokens |
| Connect to Supabase | ✅ probe in Settings; needs `.env` to report *connected* |
| Run the tests | ✅ `npm test` |
| Build an iOS development build | ⏳ requires macOS or EAS Build |

## Phase 2 — Design system + UX prototype ✅

Direction fixed as **editorial · documentary · premium · calm** and written down
in `docs/DESIGN_SYSTEM.md`.

All sixteen components built: Text, Button, Screen, Avatar, Skeleton,
EmptyState, ErrorState, Sheet, Toast, CountryBadge, Timer, HumanPortrait,
SelectingHuman, QuestionCard, ReportAction, LanguageSelector.

Two developer surfaces, both reachable from Settings:

- **Components** — every component with realistic states.
- **UX preview** — a complete fabricated Today's Human (Aya, Kyoto, HUMAN #0128)
  so the editorial direction can be judged before Phase 7 builds the real thing.

Component testing starts here: 19 render tests, including two that fail the
build if a downvote affordance or a guest vote ever appears.

Also in this phase: Supabase credentials wired and the connection verified
against the live project, `eas.json` with development / staging / production
profiles, and a fix to the Phase 1 connection probe, which read local storage
and so could not fail.

## Phase 3 — Authentication & user profile ✅

- `profiles` migration applied to the live Supabase project: RLS, column-level
  GRANTs, an age-gate trigger, and two enums. Anonymous access verified denied.
- Sign in with Apple (native button, iOS only) and email six-digit code. No
  classic passwords.
- Onboarding form: four required fields, three optional, `birth_year` writable
  once and never again.
- Settings gained an account section: guest notice and sign-in, or signed-in
  identity, sign out, and a delete-account screen that states the Archive
  tombstone rule before the button.
- `src/features/auth/gate.ts` makes the guest/account boundary an explicit,
  tested list rather than an assumption scattered across screens.

127 tests. Two new suites are constitutional guards: `gate.test.ts` fails if
anything is added to the four account-required actions, and
`profile-privileges.test.ts` fails if a migration ever grants a user write
access to their own eligibility.

**Still needed from a human:** Apple must be enabled as a provider in the
Supabase dashboard, and a Service ID plus key created in the Apple Developer
account, before Sign in with Apple works on a real build.

## Phase 4 — Eligibility & the daily selection engine ✅

The phase where fairness stops being a promise and becomes a reproducible
record.

- `daily_draws` — permanent audit row per cycle: pool hash, CSPRNG seed,
  primary and three backups, the ten-state machine from Article 4.3. One human
  per cycle is a partial unique index, not a code path.
- `draw_candidates` — the frozen pool, so the recorded hash proves something.
- `run_daily_draw()` freezes, hashes, seeds with `gen_random_bytes(32)`, and
  orders candidates by `HMAC-SHA256(candidate_id, seed)`. No `order by
  random()` anywhere.
- `escalate_draw()` — primary → backup 1 → 2 → 3 → emergency re-draw, which
  supersedes rather than edits so history survives.
- `is_eligible()` — binary, and structurally incapable of taking a forbidden
  input because there is nowhere to put one.
- `draw_rank()`, `draw_order()`, `pool_hash()` are granted to **anon**: anyone
  can recompute a published result and check it (Article 12).
- Split `wants_selection` (the user's choice) from `selection_eligible` (the
  system's judgement), resolving a contradiction Phase 3 introduced — Article
  5.6 lets a user leave the pool, but the column GRANTs had made that
  impossible.
- Settings → The daily draw: eligibility status, every unmet reason in full,
  and the opt-out switch.

**Two independent implementations.** `tests/helpers/draw.ts` is written from the
constitution rather than from the SQL, and `npm run verify:draw` cross-checks it
against the live database. On its first run it found a real bug: `pool_hash([])`
returned NULL while `run_daily_draw` recorded `sha256('')` — a disagreement in
exactly the Quiet Day case. Fixed in `20260822040000_pool_hash_empty.sql`.

184 tests. The fairness test runs 10,000 draws over 10 candidates and fails if
any of them wins outside ±15% of an equal share.

**Not done, and needed before a real cycle runs:** nothing schedules
`run_daily_draw`. It must be called at D-2 00:00 UTC, by `pg_cron` or an
external scheduler. That belongs with Phase 5's notification timing.

## Phase 5 — Fairness, transparency & candidate notification ✅

- `draw_invitations` — who was asked, when, and what they answered. Escalation
  used to overwrite `selected_user_id`, so the record of who was actually asked
  was lost; now it survives, and `expired` is kept distinct from `declined`
  because only one of them was a decision.
- 12-hour window enforced by the database. A late acceptance is refused — two
  accepted humans for one cycle is the one thing Article 1.6 forbids outright.
- `accept_selection()` / `decline_selection()` take no arguments, so they
  cannot be aimed at anyone else. Declining asks the next backup immediately.
- **Scheduling is live.** `pg_cron` runs the draw at 00:00 UTC for D+2,
  notifies at 00:10, and sweeps expired invitations every 15 minutes.
  `scheduler_status` records whether it installed, so an unscheduled cycle is
  visible rather than silent.
- "You were selected." screen and the public **How selection works** page,
  open to guests, with every number pulled from `constants/constitution.ts`.

**Security fix, found by probing rather than by review.** Every privileged
function was executable by anonymous callers holding the publishable key that
ships in the app — `escalate_draw` among them, which would have let anyone skip
the selected candidate. Two causes: Postgres grants EXECUTE to `PUBLIC` on new
functions, and Supabase additionally grants it to `anon` directly, so
`revoke ... from anon` in one migration does nothing for the next function
added. Fixed in `20260822080000` and `20260822090000`, and the default privilege
is now revoked so a new function is closed until someone opens it.

`npm run verify:privileges` probes the live database against an explicit
allowlist and is the reason this cannot regress quietly.

228 tests. New guards: the invitation copy may not say "Today's Human" in any
locale, and neither `decline_selection` nor `expire_stale_invitations` may
touch a single eligibility column.

## Phase 6 — Human Portrait Builder ✅

- `portraits` and `portrait_elements`: answers stored against the prompt key,
  so the question is never separated from the answer
- seven written prompts, five required, plus a photograph. Everything beyond
  the minimum is the author's choice and a skipped prompt is never shown as an
  absence
- edits are refused once submitted, by trigger. Otherwise the text a moderator
  approved and the text published could differ, which makes review theatre
- private `avatars` and `portraits` storage buckets, owner-scoped by folder
- **Verification policy decided** (`docs/VERIFICATION_POLICY.md"): email plus a
  seven-day-old account to enter the pool, liveness only before publication
- **Community rules drafted** (`docs/COMMUNITY_RULES.md`), live in all three
  languages, with an acceptance screen — `accepted_rules_at` had no way to be
  set before this, so the pool was permanently empty
- bundle identifier corrected to the registered `com.unumae.app`

## Phase 7 — Today's Human experience ✅

The first phase where a stranger can actually be met.

- `publish_due_cycles()` at 00:01 UTC: yesterday's human enters the Archive,
  today's goes live — but only if a person approved the portrait. The human
  number is assigned at publication, so a cancelled cycle consumes none and
  the Archive has no meaningless gaps.
- `get_todays_human()`, `get_portrait_elements()`, `get_questions()` are open
  to **anon**. `profiles` and `portraits` stay owner-only: publication exposes
  one chosen row through a function, never a table.
- Questions, voting and Remember, each behind a function that checks the cycle
  is live — a rule that belongs next to the data, not in whichever client is
  calling.
- Photographs stay in a private bucket. A storage policy makes an object
  readable exactly when its cycle is live, so "not before publication" is
  enforced by the same database that decides when publication happened — no
  service key handed out, no files copied.

Two rules are now unrepresentable rather than merely disabled:

- **No downvote.** `question_votes` has no direction, value or weight column.
  The only thing a row can say is "this person asked for this question", and a
  test fails if such a column ever appears.
- **No Remember count.** `do_i_remember()` answers about the caller; there is
  no function, view or grant anywhere that counts how many people kept
  somebody, and a test asserts none appears.

273 tests.

## Phase 8 — Human Archive, discovery & One Year Ago ✅

- `get_archive()` — newest first, filterable by country and year, paginated.
  It takes **no ordering argument**, and reads no vote or Remember data, so
  there is nothing for a future "sort by popular" to sort by.
- `get_human()` — one archived Human, the same shape as `get_todays_human()`,
  so one screen renders either.
- `get_random_human()` — sampled by random offset, not `order by random()`,
  which stays banned everywhere so it can never quietly reappear in the draw.
- `get_anniversaries()` — one, five, ten and twenty-five years ago today. Empty
  until the Archive is old enough, and needs no change when it is.
- `get_archive_countries()` / `get_archive_years()` — the filter lists, ordered
  alphabetically and chronologically. A country list sorted by count would be a
  ranking of countries.
- All six are granted to **anon**: the Archive is readable in full by guests.

**The tombstone is now visible.** A removed Human keeps their number and date
and loses everything else (Article 8.6). The listing uses left joins so they
still appear — an inner join would make them vanish and leave the sequence
gappy — and `is_removed` is returned explicitly so no screen has to infer it
from a missing name.

Screens: the Archive tab with anniversaries, a Random Human button, country and
year filters, and the chronological list; plus `/human/[id]`, which renders an
archived portrait with its questions and answers, and no countdown.

306 tests. The new suite asserts the Archive cannot be ranked: no ordering
argument, no count read, and no function named `top_human`, `most_liked`,
`trending`, `popular`, `leaderboard` or `ranking`.

## Phase 9 — Trust & safety ✅

Seven tables: `moderators`, `content_reports`, `moderation_events`,
`moderation_decisions`, `user_blocks`, `account_flags`, `app_settings`.

**Moderation authority is not a profile column.** It lives in its own table, so
no client GRANT can ever expose or grant it. Every moderator function refuses
inside the database — the client decides what to show, never who may act.
Getting the first wrong leaks a button; getting the second wrong leaks a
capability.

**Every decision is logged, and the log is append-only.** `moderation_events`
records who acted, on what, and why. Nothing updates or deletes it, and no
client role has any write on it. A decision nobody can review afterwards is a
decision nobody can be held to.

**Layer 2 screening is structural, not a word list.** Links, shouting, repeated
characters, handle mentions. A list of forbidden words in a repository ages
badly and misfires on the people it is meant to protect — semantic screening
belongs to a service that can be corrected without a deployment. Nothing here
rejects anything; it raises a flag so a human looks sooner.

**Blocking now means something.** It was a row that changed nothing anybody
could see. A blocked person's questions disappear from the blocker's view and
stay visible to everyone else: blocking is a personal filter, not a moderation
decision, and one person must not be able to remove another's words from the
world by pressing a button.

**Privacy.** `city_hidden` separates hiding from erasing — somebody who wants
their city private this year and public next should not have to retype it.
`export_my_data()` returns the rows themselves rather than a summary.

**Liveness before publication** is written into `publish_due_cycles()` and
switched off in `app_settings`, because no capture flow exists yet and turning
it on would make every cycle a Quiet Day. The switch is recorded rather than
remembered.

Screens: `/admin` (portrait, question and report queues — plain, reliable, two
decisions per item) and Settings → Privacy.

333 tests. Also fixed a latent weakness in the older schema guards: they
matched the **first** definition of a function, but `create or replace` means
the last one wins — so they had been validating superseded SQL.

## Phase 10 — Notifications, localization & translation ✅

The plan named the thing to avoid: **"COME BACK!!! 🔥🔥🔥"**. So the constraint
is structural rather than a matter of tone.

- **Four categories, and the enum has exactly four values**: daily, selected,
  answered, anniversary. A test fails on any of `reengage`, `streak`,
  `reminder`, `inactive`, `winback`, `promo` appearing anywhere in the schema.
- **Defaults are conservative**: the two categories about *you* (selected,
  answered) are on; the two about the product (daily, anniversary) are off
  until asked for.
- `notifications_due()` returns recipients, a category and a **locale** —
  never a written sentence. The copy lives with the rest of the product's
  words, so a notification cannot drift from the language everything else uses.
- Every send is recorded with a dedupe key, so a retried job cannot send twice
  and anybody can check how often this product contacts a person.
- Nobody is told about their own day.

**Translation is additive by construction.** `portrait_element_translations` is
a separate table keyed by locale, and `get_portrait_elements()` knows nothing
about it. There is no code path that can return a translation *instead of* the
original, because they come from different functions. The reader chooses, the
label always says which they are reading, and it opens on the original.

`send-notifications` Edge Function written: reads the queue under the service
role, composes in the reader's language, posts to Expo, and records each send
individually so a partial failure leaves an accurate log.

355 tests.

## Phase 11 — Analytics, sharing & landing web ✅

**Analytics that cannot become tracking.** The plan asks for real product
numbers from Beta. The difference between that and surveillance is not intent,
it is which columns exist:

- The event list is an **enum of sixteen values**. "What do you collect?" has an
  exact answer, and a test counts them.
- There is no column for an IP address, a user agent, a device model, an
  advertising id or a location. Not blank — **absent**.
- No third party receives any of it. It is a table in our own database.
- Rows are deleted after 90 days by a scheduled job, not by a promise.
- A guest can **write** an event and read nothing; no policy grants any client
  a read on that table at all. The KPIs are moderator-only.
- The five KPIs are the ones the plan named — activation, curiosity,
  engagement, memory, sharing — and a test asserts DAU/MAU is not among them.

**One honest cost, disclosed rather than buried.** Answering "did people come
back the next day" is impossible without some per-installation identifier, and
that number is the single most important one before spending anything on
growth. So there is a random `install_id`, generated on device, linked to no
advertising profile, deleted with its events after 90 days — and named
explicitly on the privacy page rather than left to be discovered.

**Sharing.** A share message built as a pure function so its wording is
testable: who, where, an optional quote, the tagline, the link. Tests assert it
never mentions views, Remembers, votes or followers — sharing must not turn a
person into a metric.

**Landing surface.** `about`, `legal/privacy` and `legal/terms` join the pages
that already exported to web, so a shared link is understandable to somebody
who has installed nothing.

399 tests over 24 suites. `send-notifications` deployed, and hardened: it had
accepted the anon key that ships in the app, which would have let anybody
trigger the whole send queue. It now requires the service role.

## Phase 12 — Accessibility & poor connectivity ✅

**Contrast is proved, not assumed.** `src/theme/contrast.ts` implements the WCAG
relative-luminance maths, and 38 tests check every text-on-surface pairing in
both themes. Body text meets AA on background, surface and surfaceRaised;
tertiary text, danger and success meet AA for large text; the primary button's
label is readable on its own fill. A colour that looks fine on a laptop in a
dark room can be unreadable outdoors, and that is not something to review by
eye.

**Dynamic Type is bounded, never refused.** `Text` sets a per-variant
`maxFontSizeMultiplier` — tighter for display text, which starts at 40pt, and
generous for body copy. A test fails if `allowFontScaling={false}` appears
anywhere: bounding the scale is fine, refusing it is not. Title variants carry
`accessibilityRole="header"`, so a screen reader can offer to jump between
headings.

**Offline.** TanStack Query persists to AsyncStorage, so a cycle read once stays
readable without a connection. What persists is an **allowlist** — today's
Human, questions, the Archive — so a private query added later is not cached by
default. Profiles, libraries, moderation queues and permissions never touch
disk, and a failed query is never cached: showing a stale error to somebody who
has come back online is worse than showing nothing.

**Poor connections.** Images moved to `expo-image` with disk caching, and a
photograph is downscaled to 1600px before upload. A camera original is 3–12MB
and the app displays it at about 400pt; on the connections much of the world
actually has, that is the difference between a portrait being submitted and
abandoned halfway.

An offline notice states plainly that what you are reading came from the last
time you had a connection — not an error, and not a modal.

Haptics: exactly one, a light confirmation, switchable off. No celebration and
no error buzz — a vibration that rewards would make Remember a score.

465 tests over 27 suites.

## Phase 13 — Testing & App Store readiness ✅

**`npm run verify:security` attacks the live database as a real signed-in
user.** The earlier probe asked what an anonymous stranger can reach; this asks
the harder question — what can somebody who has legitimately signed up do that
they should not. It creates two throwaway accounts, attacks with one against
the other, and deletes both. 31 checks, covering: reading another profile,
setting your own `selection_eligible` / `verification_level` / `account_status`,
rewriting your own birth year, inserting yourself into `moderators`, calling
every moderator function, driving the draw, reading who was drawn, and writing
into somebody else's storage folder.

**It found a live bug on its first honest run.** The Phase 7 storage policy
decided whether a photograph was published by joining `daily_draws` — but
clients hold only *column-level* SELECT on that table, and `id`, which the join
needs, is deliberately not granted. Evaluating the policy raised `permission
denied for table daily_draws`, and because Postgres evaluates every permissive
SELECT policy, that aborted **all** reads of the portraits bucket. Not only
unpublished ones: an author could not read back their own upload, and no signed
URL could be created for today's Human. The main screen would have shown no
photograph at all.

What surfaced it was the *control* assertion — the check that the permitted
case still works — added specifically so a refusal could not be mistaken for a
policy doing its job. Without it the suite would have reported success while
the feature was broken. Fixed by moving the decision into a security definer
function, in `20260823020000` and `20260823030000`.

**App Store**: the iOS privacy manifest is in `app.config.ts` —
`NSPrivacyTracking: false`, six collected data types, three required-reason
APIs. `docs/APP_STORE.md` carries the privacy-label answers, the age-rating
questionnaire, the required URLs, the "this is not a sweepstake" argument, and
the four rejections worth anticipating.

492 tests offline, plus four live suites: draw cross-check, anonymous access,
signed-in privilege escalation, and the full-loop simulation.

## Phase 14 — Internal Alpha, Private Beta & retention validation ✅

**`npm run simulate` runs the whole loop in three minutes instead of three
days.** `scripts/simulate-cycle.mjs` creates 12 throwaway candidates, backdates
them into eligibility, runs two full cycles — draw, invitation, acceptance,
portrait, moderation, publication — exercises the audience, checks the Archive,
then deletes everything it made and rewinds the human number sequence so the
first real Human is still #1.

**It found two fatal bugs that all 465 offline tests had missed.** Both were the
same mistake: a `CASE` with two literal branches resolves to `text`, and
Postgres will not assign `text` to an enum without an explicit cast.

- `run_daily_draw` raised every time it was called. It had never once worked —
  since Phase 4. The nightly job at 00:00 UTC would have failed silently every
  night, and the first symptom would have been an empty product on launch day.
- `review_portrait`, `review_question`, `resolve_report` and `set_account_status`
  raised too, so nothing could ever be approved, so `publish_due_cycles` had
  nothing to publish, so no cycle could ever go live.

Together: the product's entire pipeline had never worked end to end while the
suite was green. Fixed in `20260823050000` and `20260823060000`.

The lesson is structural and worth keeping in mind for every guard here: **the
schema tests read the migrations as text.** They verify what the SQL says, not
that it runs. Anything that only executes on a three-day cycle needs a way to be
executed in three minutes, or it stays broken until it matters.

**Founding Humans** — "Joined during Year Zero" — is a badge with no selection
advantage, and that is enforced rather than promised. There is no column: it is
derived from the join date and the Archive's first day, so there is nothing to
award, revoke or weigh. `is_eligible`, `draw_order` and `run_daily_draw` have
never referenced it, and `tests/retention-schema.test.ts` fails the build if
that changes. `am_i_founding()` takes no argument, so it cannot be used to fish
for somebody else's join date. Year Zero is the first 365 days of the Archive,
counted from the first published cycle rather than a date typed into a file.

**The growth gate** is four pre-committed thresholds — D1 25%, D7 10%,
participation 15%, share rate 3% — held in `src/constants/retention.ts` and in
the migration, asserted equal by test. `retention_cohorts()` reports D1 and D7
by join-day cohort, and reports `null` rather than `0` for cohorts too young to
have reached that day: a cohort that arrived yesterday has not failed D7, it has
not reached it, and scoring it zero would make the gate answerable by waiting
instead of by improving. The gate weights by cohort size so a lucky
three-person cohort cannot swing a decision that costs money. Moderator-only,
readable in the console's new **Signals** tab.

The rule it exists to enforce: **if D1 is bad, we buy no users — we fix the
product.** Full plan in `docs/BETA.md`.

## Phase 15 — First viral experiments & 1,000 users ✅

**The transparency numbers**, in the shape the plan asked for:

```
1,042 Humans waiting
43 countries
137 languages
```

`selection_stats()` is public, including guests — "one in a thousand" is not
checkable by somebody who cannot see how many are waiting. It counts the pool
with `is_eligible()` rather than a hand-written copy of the predicate, so it can
never drift from the function that actually freezes the pool and leave us
publishing a confident wrong number. It appears on "How selection works", next
to the claim it substantiates.

`country_representation()` names only countries with **at least five** people
waiting. A country with two is a country where being drawn identifies you, and
the Archive would confirm it the same day. The rest are counted in
`unnamed_countries()` and published alongside, so the arithmetic reconciles — a
transparency page whose numbers do not add up teaches people to distrust the
ones that do. The floor is in the database, not the client: the rows are never
returned, so there is nothing for a caller to ask for.

**Share cards.** `ShareCard` renders at a fixed 1080×1350 off-screen and is
captured to a PNG, so the exported image is identical from every phone. It
carries a number, a name, a place and one line in their own words — and no
count of any kind, because a share card is the most public surface the product
has and the last place a person should become a score. Both native modules are
loaded lazily inside a `try`: if the capture is unavailable the button falls
back to the text share without comment, because a share button that does
nothing is worse than a share without a picture. Now on the Archive page too.

**The translation job.** The write path has existed since Phase 10; what was
missing was the thing that decides what still needs translating.
`pending_translations()` offers only approved, published portraits — sending
somebody's answers to a vendor before a moderator has looked at them would be a
leak with a queue in front of it. `record_same_language()` stops the job asking
about the same French answer every night forever. The Edge Function is written
and needs a DeepL key; without one it reports "not configured" and changes
nothing, rather than failing loudly every night or pretending to have worked.

**`docs/GROWTH.md`** carries the four hooks — the TikTok line, the Instagram
portrait, the X quote, the Reddit claim — and, more usefully, the list of things
that are forbidden rather than merely discouraged: referral rewards, paid
placement in the draw, "X people viewed you", featuring "the best" Humans,
streaks. The TikTok line comes with the constraint that makes it safe: *"12,000
people met this one stranger"* is a fact about the product and must never become
a number attached to a person inside the app. A view count is a score with
better manners, and `tests/stats-schema.test.ts` fails the build if one appears.

**Two guards were wrong, not the code.** The forbidden-column check stripped
`--` comments but not `/* */` blocks, so a block comment using "reach" as an
ordinary English word failed the build; its stated intent covered both forms and
now it does. And the Dynamic Type rule now has exactly one exemption — the share
card, which is never on screen — named by path, with a second test asserting the
exemption really is a fixed-size export.

## Phase 16 — next

Scale and AI features.

## Working agreements

- **No GitHub Actions.** `npm run verify` runs locally and on pre-push.
- **Commit and push every change.**
- A constitution parameter never changes alone: `src/constants/constitution.ts`
  and `docs/PRODUCT_CONSTITUTION.md` are asserted against each other.
