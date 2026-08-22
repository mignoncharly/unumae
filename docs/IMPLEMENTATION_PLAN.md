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
| 4 | Eligibility & daily selection engine | ⬜ next | ✅ |
| 5 | Fairness, transparency & candidate notification | ⬜ | ✅ |
| 6 | Human Portrait Builder | ⬜ | ✅ |
| 7 | Today's Human experience | ⬜ | ✅ |
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

## Phase 4 — next

Eligibility and the daily selection engine. The `daily_draws` table, the frozen
candidate pool with its hash, a CSPRNG seed recorded before the draw, primary
plus three backups, and the state machine from Article 4.3. This is the phase
where fairness stops being a promise and becomes a reproducible record.

## Working agreements

- **No GitHub Actions.** `npm run verify` runs locally and on pre-push.
- **Commit and push every change.**
- A constitution parameter never changes alone: `src/constants/constitution.ts`
  and `docs/PRODUCT_CONSTITUTION.md` are asserted against each other.
