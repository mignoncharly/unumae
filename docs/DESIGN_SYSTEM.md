# Design system

Phase 2. Companion to [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)
Article 11.

## The direction

**Editorial · documentary · premium · calm.**

Not a SaaS dashboard. Not a flashy social app. The closest reference is a
long-form magazine profile: generous whitespace, one photograph, prose that is
allowed to be long, and no chrome competing with the person.

> The person is the star. The interface is furniture.

Three consequences that decide most design arguments before they start:

1. **The portrait owns the hero.** A Human is never reduced to a generic profile
   row. Portraits are large, image-led and surrounded by quiet editorial
   context; archive cards remain recognisably about a person rather than a
   metric.
2. **Brand colour guides, it does not compete.** Cobalt, indigo and violet mark
   navigation, actions and selected states. Warm and neutral reading surfaces
   keep the photograph and the Human's words dominant.
3. **The screen ends.** Every screen reaches a bottom. Nothing loads more.

## Tokens

`src/theme/tokens.ts`. Seven families, asserted by
`src/theme/__tests__/tokens.test.ts`.

| Family | Notes |
| --- | --- |
| `colors` | Light and dark, identical key sets. Layered warm-neutral surfaces, semantic state surfaces, and the cobalt/indigo/violet brand family |
| `spacing` | 4pt scale, `none` → `huge` (64), monotonic |
| `radius` | `sm` 4 → `xl` 20, plus `full` |
| `typography` | `caption` 12 → `display` 40, plus a mono family for numbers |
| `shadows` | `none`, `subtle`, `raised`. Used sparingly |
| `motion` | Durations and easings; `ceremonial` is the only one over 500ms |
| `breakpoints` | phone → desktop, for the Phase 11 web surface |

**Monospace for numbers.** The countdown and human number use the mono family so
digits do not shift width as they tick. `18:43:12` must not jitter.

## Motion

Article 11: animation is discreet.

| Duration | Use |
| --- | --- |
| `instant` 100ms | State flips |
| `fast` 180ms | Toasts, opacity |
| `normal` 260ms | Sheets, transitions |
| `slow` 420ms | Skeleton pulse |
| `ceremonial` 900ms | *Only* "Selecting tomorrow's human…" |

Every animation asks `useReducedMotion()` first. A component that animates
without consulting it is an accessibility bug, and the token test caps everyday
durations at 500ms so a "more delightful" 2-second transition fails the build.

**What the ceremonial animation deliberately is not:** a spinning reel of faces.
That would imply the outcome is being decided while you watch. It is not — the
draw happened at D-2 00:00 UTC and is already recorded. A slot machine
animation would be a lie about fairness, which is the one thing this product
cannot afford.

## Components

`src/components/`. Every one is rendered in **Settings → Components**, and a
full mock screen lives in **Settings → UX preview**.

| Component | Notes |
| --- | --- |
| `Text` | Every string goes through it. Variants, colour tokens, one place for Dynamic Type |
| `Button` | Primary, secondary, ghost and destructive variants with optional Feather icons. 44pt minimum target |
| `Avatar` | Image, or a single initial — never a surname (Article 6.3) |
| `Screen` | Safe-area scroll container that ends |
| `Skeleton` | Calm pulse, never a shimmer sweep |
| `EmptyState` | Empty is legitimate here; it never apologises |
| `ErrorState` | Renders an i18n key from `AppError`, never server text |
| `Sheet` | The only modal. Always dismissible |
| `Toast` | Confirmation, never celebration |
| `CountryBadge` | Flag from regional indicators + localised country name |
| `Timer` | The countdown. Identical for every viewer on earth |
| `HumanPortrait` | The editorial layout. Prompt above answer |
| `SelectingHuman` | The one ceremonial animation |
| `QuestionCard` | Upvote only. No downvote exists to be styled |
| `ReportAction` | Always reachable, never prominent |
| `LanguageSelector` | Each language named in its own language |
| `TextField` | Added in Phase 3. Label, hint, error; the error replaces the hint |
| `Surface` | The shared elevated, muted, accent, violet and warm reading surfaces |
| `PageHeader` / `SectionHeader` | Consistent hierarchy for utility and editorial screens |
| `ListGroup` / `ListRow` | Native-feeling grouped settings and preference sections |
| `Pill` | Archive filters and compact selected states |
| `BrandHero` | Wordmark-led dark brand moment for auth, onboarding and invitations |
| `ArticleSection` | Reusable long-form section treatment for rules and explanatory pages |
| `RememberAction` | Signature private-archive interaction; never a public Like |

## Rules that are enforced, not just documented

- **No hardcoded UI text.** Strings come from `src/i18n/locales/*.json`, and the
  key-parity test fails if EN, FR and DE drift apart.
  *Exception:* `src/app/dev/*` are developer instruments that never ship to a
  user's flow; translating fabricated preview copy would be noise.
- **44pt minimum touch targets** on every pressable.
- **No downvote.** `QuestionCard`'s test asserts that no downvote affordance
  exists, so adding one fails the build rather than a review.
- **No Remember count.** Not in the component, not in the preview.
- **Reduced motion** is respected by `Skeleton`, `Toast`, `Sheet` and
  `SelectingHuman`.

## What Phase 2 deliberately left out

`HumanPortrait` renders prose and one photograph. Audio and video (portrait
element 9) wait for Phase 6, where the Portrait Builder decides how they are
captured. Designing a player before knowing what it plays would be guesswork.
