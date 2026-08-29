# Unumae

> **8 billion people. One today.**

Every day, one ordinary person from the community becomes Today's Human. The
world discovers their story for 24 hours, asks them questions, and remembers
them forever in the Human Archive.

No followers. No popularity contest. No way to pay for a better chance.

## Read this first

[**docs/PRODUCT_CONSTITUTION.md**](./docs/PRODUCT_CONSTITUTION.md) — the binding
rules that decide what this product is allowed to become. Article 1 cannot be
amended. Every feature request is measured against it.

| Document | What it covers |
| --- | --- |
| [PRODUCT_CONSTITUTION.md](./docs/PRODUCT_CONSTITUTION.md) | Product rules, fairness, safety, monetization limits |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Stack, layout, state, environments, verification |
| [DATABASE.md](./docs/DATABASE.md) | Schema conventions, RLS posture, planned tables |
| [SECURITY.md](./docs/SECURITY.md) | Threat model, secrets, proof of humanity |
| [REMAINING_IMPLEMENTATION_NO_ACTION_REQUIRED.md](./docs/REMAINING_IMPLEMENTATION_NO_ACTION_REQUIRED.md) | Current repository-only work and verification |
| [REMAINING_IMPLEMENTATION_EXTERNAL_ACCESS_REQUIRED.md](./docs/REMAINING_IMPLEMENTATION_EXTERNAL_ACCESS_REQUIRED.md) | Current device, account, staffing, and release gates |
| [implementation-roadmap-v2.md](./docs/implementation-roadmap-v2.md) | Detailed implementation history and release requirements |
| [RELEASE_CHECKLIST.md](./docs/RELEASE_CHECKLIST.md) | Exact-build release evidence checklist |
| [MODERATION.md](./docs/MODERATION.md) | Who can moderate, and how the first one comes to exist |
| [SURFACES.md](./docs/SURFACES.md) | Which pages live in the app and which on the website |
| [APP_STORE.md](./docs/APP_STORE.md) | Review answers, and what still needs a person |
| [VERIFICATION_POLICY.md](./docs/VERIFICATION_POLICY.md) | Who may enter the draw, and who may be published |
| [COMMUNITY_RULES.md](./docs/COMMUNITY_RULES.md) | The rules users accept |
| [ENVIRONMENTS.md](./docs/ENVIRONMENTS.md) | Local/CI plus the single hosted Supabase and EAS projects |

## Getting started

```bash
npm install
cp .env.example .env     # then fill in your Supabase project
npm start
```

The app runs without Supabase credentials — guest viewing degrades to an empty
state rather than crashing.

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Expo dev server (development environment) |
| `npm run web:dev` | Start the static marketing site in background mode |
| `npm run web:build` | Build the marketing site to `website/dist/` |
| `npm run web:check` | Typecheck, lint, format-check, and build the marketing site |
| `npm run start:hosted` | Explicit hosted-project development mode; use only for bounded hosted verification |
| `npm test` | Jest suites |
| `npm run verify` | typecheck → lint → format → migrations → tests |
| `npm run ios` | Local iOS build (requires macOS) |

## Verification and CI

`npm run verify` runs the core pipeline locally, `.githooks/pre-push` runs it on
every push, and GitHub Actions adds required application, website, fresh
database, and Edge Function checks. Hosted deployment accepts only an exact
commit SHA with a successful CI run.

Two checks are worth knowing about, because they will stop you one day:

- A migration adding `followers`, `popularity_score` or any other ranking column
  fails the build — Constitution Article 7.2.
- Changing a value in `src/constants/constitution.ts` without amending
  `docs/PRODUCT_CONSTITUTION.md` fails the build, and vice versa.

Both are deliberate. They exist so the answer stays "no" long after the reasons
to say yes start sounding excellent.

## Status

Roadmap v2 Phases 1–10 and repository-side release hardening are implemented.
Hosted Phase C evidence is complete; the current repository backend changes
pass protected CI and await deployment from an approved exact SHA. Signed
physical-iPhone, restore-target, staffing, and release evidence remains. The
current release is iOS-first; Android is preserved but deferred to
[POST_IOS_ANDROID.md](./docs/POST_IOS_ANDROID.md). The two remaining-work files
above are the current status source.
