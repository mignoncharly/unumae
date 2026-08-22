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
| [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md) | 18 phases and their status |
| [OPEN_ITEMS.md](./docs/OPEN_ITEMS.md) | What is waiting on you, and what is waiting on me |
| [VERIFICATION_POLICY.md](./docs/VERIFICATION_POLICY.md) | Who may enter the draw, and who may be published |
| [COMMUNITY_RULES.md](./docs/COMMUNITY_RULES.md) | The rules users accept |
| [ENVIRONMENTS.md](./docs/ENVIRONMENTS.md) | Three environments, three Supabase projects |

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
| `npm run start:staging` | Same, against staging |
| `npm test` | Jest suites |
| `npm run verify` | typecheck → lint → format → migrations → tests |
| `npm run ios` | Local iOS build (requires macOS) |

## Verification, not CI

This project runs **no GitHub Actions**. `npm run verify` runs the full pipeline
locally, and `.githooks/pre-push` runs it on every push, so nothing unverified
reaches the remote. The hook installs itself during `npm install`.

Two checks are worth knowing about, because they will stop you one day:

- A migration adding `followers`, `popularity_score` or any other ranking column
  fails the build — Constitution Article 7.2.
- Changing a value in `src/constants/constitution.ts` without amending
  `docs/PRODUCT_CONSTITUTION.md` fails the build, and vice versa.

Both are deliberate. They exist so the answer stays "no" long after the reasons
to say yes start sounding excellent.

## Status

Phases 0–9 of 18 complete. Development runs in Expo Go on Android; Sign in with
Apple needs a native build and hides itself until then. See [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md)
for detail and [OPEN_ITEMS.md](./docs/OPEN_ITEMS.md) for what is outstanding.
