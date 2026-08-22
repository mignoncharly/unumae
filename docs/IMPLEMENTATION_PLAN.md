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
| 7 | Today's Human experience | ⬜ next | ✅ |
| 8 | Human Archive, discovery & One Year Ago | ⬜ | ✅ |
| 9 | Trust & safety | ⬜ | ✅ |
| 10 | Notifications, localization & translation | ⬜ | ✅ |
| 11 | Analytics, sharing & landing web | ⬜ | ✅ |
| 12 | Accessibility & offline | ⬜ | ✅ |
| 13 | Testing & App Store readiness | ⬜ | ✅ |
| 14 | Internal Alpha, Private Beta & retention | ⬜ | ✅ |
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

## Phase 7 — next

Today's Human: the live screen, questions, voting and Remember.

## Working agreements

- **No GitHub Actions.** `npm run verify` runs locally and on pre-push.
- **Commit and push every change.**
- A constitution parameter never changes alone: `src/constants/constitution.ts`
  and `docs/PRODUCT_CONSTITUTION.md` are asserted against each other.
