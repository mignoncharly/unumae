# Architecture

Companion to [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md). Where the
constitution says what the product may become, this file says how it is built.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | Expo SDK 57, React Native 0.86, React 19 | iOS first, Android and web share the logic later (Phase 17) |
| Routing | Expo Router (file-based) | Deep links for share cards are routes, not special cases |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` | The draw must not fail on an `undefined` |
| Server state | TanStack Query | Cache, retry and staleness handled once |
| Local state | Zustand | Only for genuinely global device state |
| Forms | React Hook Form + Zod | Same Zod schemas validate client and edge functions |
| i18n | i18next + expo-localization | EN canonical, FR and DE at MVP |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions, RLS) | One managed platform, RLS as the security model |
| Tests | Jest + jest-expo | Officially supported RN transform; Maestro for E2E later |

## Directory layout

```text
src/
├── app/            Expo Router routes. Thin — screens compose, they do not decide.
│   ├── (tabs)/     Today · Archive · Settings. There is no fourth tab.
│   ├── (auth)/     Never a gate: guest viewing is a right (Article 6.1).
│   └── dev/        Developer surfaces (design tokens).
├── components/
│   ├── ui/         Primitives: Text, Button, Screen.
│   └── shared/     Composed, cross-feature widgets.
├── features/       One folder per domain slice, each owned by a phase.
├── lib/            Infrastructure: supabase, env, errors, analytics, validation.
├── constants/      constitution.ts — the parameters the document fixes.
├── theme/          Design tokens and the light/dark palette.
├── i18n/           Init plus locales/{en,fr,de}.json.
├── stores/         Zustand stores.
└── utils/          Pure functions. cycle.ts is the UTC clock.
```

**The rule that keeps this clean:** routes render, features decide, lib talks to
the outside world. A screen that queries Supabase directly is a review comment.

## Where state lives

- **Server state → TanStack Query.** Anything that came from Supabase.
- **Device state → Zustand, persisted to AsyncStorage.** Language preference,
  onboarding seen. Nothing a server needs to know.
- **Form state → React Hook Form.** Never lifted into a store.

There is deliberately no global app store. The cycle is the only shared concept
and it is derived from the clock, not stored.

## The cycle clock

`src/utils/cycle.ts` is the single source of truth for Article 4. Everything —
countdown, draw schedule, acceptance deadline, Quiet Day cutoff, archive
transition — is computed in UTC from a `YYYY-MM-DD` cycle date. No other module
may construct a cycle boundary.

Local time exists only at render time. If a `new Date()` appears in a feature
folder doing date arithmetic, it is a bug.

## Environment

One Supabase project, one EAS project, one bundle identifier — see
[ENVIRONMENTS.md](./ENVIRONMENTS.md) for the decision and what it costs.

| Thing | Value |
| --- | --- |
| Supabase | `qpicjsjxdblrxdrdibge` |
| EAS | `@mignoncharly/unumae` |
| iOS bundle | `com.unumae.app` |
| Scheme | `onehuman://` |

`src/lib/env.ts` validates the two Supabase values with Zod at import time and
fails loudly rather than three screens later. The app still runs unconfigured —
guest viewing degrades to an empty state instead of crashing on a fresh
checkout.

iOS first. The Android config block exists so the project stays cross-platform;
no Android work is started yet.

## Verification instead of GitHub Actions

This project runs **no GitHub Actions**. The same checks run locally and are
enforced by a git hook, so nothing unverified reaches the remote:

```bash
npm run verify   # typecheck → lint → format:check → migrations → tests
```

`.githooks/pre-push` runs it on every push. `npm install` installs the hook via
the `prepare` script (`git config core.hooksPath .githooks`). The emergency
bypass is `git push --no-verify`, and it should stay unused.

What the pipeline covers today:

1. `tsc --noEmit` — strict, with `noUncheckedIndexedAccess`.
2. `eslint` — Expo config plus import ordering.
3. `prettier --check` — code only; prose and SQL are excluded so a binding
   document is never silently reformatted.
4. `scripts/verify-migrations.mjs` — migration naming, ordering, forbidden
   columns (Article 7.2), and mandatory RLS.
5. `jest` — the suites below.

## What the tests actually protect

| Suite | Protects |
| --- | --- |
| `utils/__tests__/cycle` | Article 4. UTC boundaries, DST, leap years, countdown never negative |
| `constants/__tests__/constitution` | Code and constitution agree; Article 1 is intact and still unamendable |
| `i18n/__tests__/locales` | Key parity and placeholder parity across EN/FR/DE |
| `theme/__tests__/tokens` | Token families exist; animation stays discreet |
| `tests/schema-guard` | No forbidden column; every created table enables RLS |

The constitution test reads `docs/PRODUCT_CONSTITUTION.md` and compares it to
`src/constants/constitution.ts`. Changing either alone fails the build — which
is the point: a parameter change must be a deliberate amendment.

## Phase ownership

Every `src/features/*` folder carries a README naming the phase that fills it,
so an empty directory is a plan rather than an oversight. See
[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).
