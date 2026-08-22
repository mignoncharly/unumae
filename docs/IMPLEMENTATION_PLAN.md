# Implementation plan

The 42 phases of the original plan, regrouped into 18 without losing any content
(`prompt-18.md` at the repository root carries the full text; `prompt.md` is the
original). This file tracks status only.

| # | Phase | Status | Launch blocker |
| --- | --- | --- | --- |
| 0 | Product Constitution | ✅ done | ✅ |
| 1 | Foundation & project architecture | ✅ done | ✅ |
| 2 | Design system + UX prototype | ⬜ next | ✅ |
| 3 | Authentication & user profile | ⬜ | ✅ |
| 4 | Eligibility & daily selection engine | ⬜ | ✅ |
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

## Phase 2 — next

Design system and UX prototype: refine the tokens against real portraits, and
build the component set — Button, Text, Avatar, HumanPortrait, CountryBadge,
QuestionCard, Timer, EmptyState, Skeleton, Sheet, Toast, ErrorState,
LanguageSelector, ReportAction. Text, Button, Screen and LanguageSelector exist
in draft form from Phase 1.

## Working agreements

- **No GitHub Actions.** `npm run verify` runs locally and on pre-push.
- **Commit and push every change.**
- A constitution parameter never changes alone: `src/constants/constitution.ts`
  and `docs/PRODUCT_CONSTITUTION.md` are asserted against each other.
