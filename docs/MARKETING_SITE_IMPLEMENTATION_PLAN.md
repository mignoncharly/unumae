# Unumae marketing site — implementation plan

**Status:** Phases 0–7 complete; Phase 8 next
**Target origin:** `https://www.unumae.app`
**Working origin:** configurable until the domain is purchased
**Product source of truth:** `PRODUCT_CONSTITUTION.md`

## 1. What the site has to communicate

Unumae has one memorable promise:

> Every day, one ordinary person from the community becomes Today's Human.
> The world discovers their story for 24 hours, asks them questions, and
> remembers them forever in the Human Archive.

The marketing site must make that idea understandable in one screen, earn trust
in the fairness of the draw, and make a shared link useful before the visitor
has installed the iOS app.

The public personality should feel **Gen Z, editorial, international, and
credible**. The visual shorthand is a contemporary culture magazine rather
than a startup dashboard: bold type, documentary imagery, concise language,
warm monochrome surfaces, and restrained motion. The Human remains the focal
point.

## 2. Decisions fixed before implementation

### Technical shape

- Add a dedicated static marketing site inside this repository at `website/`.
- Use **Astro + TypeScript** for content-first pages, excellent static output,
  route-level metadata, and minimal client JavaScript.
- Keep the existing Expo application at the repository root. The website is a
  sibling surface, not a rewrite of the native app and not the future PWA.
- Reuse Unumae's color, spacing, motion, and copy principles, but implement the
  web components accessibly with semantic HTML and CSS.
- Produce a static `dist/` that can be served by the existing Ubuntu server.
  Deployment configuration will not assume a purchased domain.

This separation matters because the current Expo root route is the native
Today experience, while the web root needs to be a search-friendly marketing
page. It also prevents landing-page concerns from destabilizing the iOS app.

### Product and content guardrails

- No fake users, testimonials, popularity counts, follower language, rankings,
  streaks, or invented community statistics.
- No App Store badge until a real listing URL exists.
- No waitlist form until its storage, consent language, retention, and privacy
  policy are decided.
- Guest access to a Human's story remains open.
- EN is canonical; FR and DE ship with matching content and `hreflang` links.
- Generated or stock people must never be presented as real Unumae Humans.
  Before launch, use clearly art-directed campaign imagery or labelled demo
  content. Once real, consented portraits exist, they replace those assets.
- Motion must respect `prefers-reduced-motion` and must never resemble a draw,
  roulette wheel, or slot machine.

## 3. Proposed information architecture

| Route | Purpose | Initial behavior |
| --- | --- | --- |
| `/` | Marketing homepage | Complete in the first release |
| `/today` | Destination for shared daily links | Pre-launch explanation, then live public Human |
| `/about` | Mission and product philosophy | Complete in the first release |
| `/how-selection-works` | Fairness and transparency | Complete in the first release |
| `/archive` | Explain and preview the Human Archive | Static preview first; live archive later |
| `/community-guidelines` | Public community rules | Adapt the approved repository copy |
| `/privacy` | Privacy policy | Requires approved legal copy |
| `/terms` | Terms of service | Requires approved legal copy |

Localized versions use `/fr/...` and `/de/...`; English remains at the root.
Future public archive routes such as `/human/1842`, `/date/2027-08-22`, and
`/country/cameroon` belong to the later full-web phase, not the landing MVP.

## 4. Homepage narrative

The homepage should be a finite story with no endless content stream:

1. **Opening frame** — Unumae wordmark, “8 billion people. One today.”,
   “Coming to iPhone,” and a primary link to how selection works.
2. **The premise** — one ordinary person, one global 24-hour window, one story
   the world experiences together.
3. **A Human portrait preview** — a magazine-like composition showing the
   guided storytelling format, clearly marked as a preview until real content
   is available.
4. **How a day works** — selected, invited, tells their story, reviewed by a
   person, live for 24 hours, then archived.
5. **The anti-social-network manifesto** — no followers, no rankings, no paid
   boost, no infinite feed. This is a trust section, not a feature grid.
6. **The Archive** — the growing record of everyone the world has met, explored
   by time, country, or at random—never by popularity.
7. **Fairness proof** — every eligible person has the same chance; the draw is
   recorded and reproducible.
8. **Closing invitation** — “Meet one person. Come back tomorrow.” with honest
   pre-launch language until the App Store link exists.

## 5. Implementation phases

### Phase 0 — Repository and product discovery — complete

Validated on 22 August 2026 against repository commit
`9821eff883c0a26f9836732c18539f5f492b571a` on `main`.

Sources reviewed:

- `docs/PRODUCT_CONSTITUTION.md` — binding principles, vocabulary, cycle,
  selection, participation, safety, content, Archive, and transparency;
- `docs/DESIGN_SYSTEM.md` and `src/theme/tokens.ts` — editorial direction,
  palette, type hierarchy, motion limits, breakpoints, and accessibility;
- `docs/ARCHITECTURE.md` and `docs/IMPLEMENTATION_PLAN.md` — native-app
  boundaries, current delivery state, public reads, and verification;
- `docs/COMMUNITY_RULES.md` and `docs/VERIFICATION_POLICY.md` — approved rules,
  eligibility, proof of humanity, publication, and removal commitments;
- `src/i18n/locales/en.json`, the Today and Archive screens, and the portrait
  prompts — canonical copy and the implemented product experience;
- the sharing, landing-web, and later full-web requirements in `prompt-18.md`.

Discovery decisions carried into every later phase:

- Use the canonical terms Today’s Human, Human, Human number, the Archive,
  Remember, Ask this, the draw, candidate, and Quiet Day. Do not substitute
  social-network vocabulary.
- The cycle is one global 24-hour window, 00:00–23:59 UTC. Production
  publication requires explicit acceptance, liveness verification, and human
  moderation before a person goes live once and then enters the Archive.
  Liveness and the moderation operations are still planned Phase 9 work, so
  pre-launch web copy must describe the launch state honestly.
- Eligibility is binary: active and verified account, at least seven days old,
  age 16 or older, rules accepted, opted in, and never previously selected.
  Engagement, nationality, payment, fame, and content scores never affect it.
- The pool freezes two days ahead. Its hash and secure seed make the ordered
  primary plus three backups reproducible. Public copy may simplify this
  mechanism but may not weaken or embellish the claim.
- Guest access to Today’s Human, their portrait and questions, and the Archive
  is permanent. A shared link must work without sign-in or app installation.
- Archive permanence protects the sequence, not ownership of a person’s story.
  A Human may request removal; only the number and date remain as a neutral
  tombstone, with no public reason.
- Quiet Day is the honest fallback. The site must never invent a Human, metric,
  testimonial, policy, App Store listing, or availability claim.
- The initial site is a finite, content-first marketing and sharing surface,
  not the deferred full PWA, a feed, or a replacement for the iOS app.
- English is canonical, with equivalent French and German content. Future
  translations of a Human’s own words are additive and labelled.
- The visual direction is editorial, documentary, premium, calm, accessible,
  warm-monochrome, restrained in motion, and always secondary to the person.

**Exit:** achieved. The plan uses canonical vocabulary, preserves the product
constitution, and separates the first public site from the later full web app.

### Phase 1 — Website foundation — complete

Delivered on 22 August 2026:

- Added an isolated `website/` package using Astro 7, strict TypeScript, its own
  dependency lock, ESLint, Prettier with Astro support, and static output.
- Added repository commands `web:dev`, `web:build`, and `web:check`; the Expo
  commands and dependency graph remain unchanged.
- Added `SITE_ORIGIN` as the configurable canonical origin, with a localhost
  default and `.env.example`, plus generated `robots.txt` and sitemap files.
- Added a shared metadata layout with localized titles, descriptions, canonical
  links, alternate-language links, and `x-default`. Unreviewed Privacy and Terms
  placeholders are `noindex` and excluded from the sitemap.
- Added one typed content layer for shared navigation, footer copy, product
  facts, route metadata, and matching English, French, and German launch copy.
- Generated every planned route at the English root and below `/fr` and `/de`,
  including honest pre-launch states for Today, the Archive, Privacy, and Terms.
- Added semantic header, navigation, locale switcher, footer, skip link,
  reduced-motion handling, baseline responsive styles, and a branded 404 page.
- Kept the website out of the native TypeScript, ESLint, and Prettier scopes so
  each surface verifies independently.

Validation:

- `SITE_ORIGIN=https://preview.unumae.invalid npm run web:check` passes Astro
  diagnostics, lint, formatting, and a 25-page static build.
- Runtime smoke checks return 200 for representative EN, FR, DE, and legal
  routes; an unknown route returns the branded 404.
- `npm run verify` remains green: 19 suites and 306 native tests pass.

**Exit:** achieved. Every planned localized route renders, the static build and
native verification pipeline pass, and Phase 2 can refine the visual system.

### Phase 2 — Web design system and art direction — complete

Delivered on 23 August 2026:

- Expanded the native warm-monochrome palette into accessible web tokens for
  color, fluid type, the 4-point spacing rhythm, radius, motion, content width,
  reading measure, and responsive gutters. The first release stays light-only.
- Selected Newsreader Variable for editorial display copy and Inter Variable for
  UI/body copy. The three Latin WOFF2 files are self-hosted, preloaded where
  critical, use `font-display: optional`, and ship with their OFL 1.1 licences.
- Built the one-to-twelve-column responsive layout, fluid type scale, 44px
  controls, text links, dividers, sticky header, locale switcher, and footer.
- Added shared `ActionLink` and `Divider` primitives, a tabular countdown study,
  and an abstract CSS campaign composition that depicts no real or fictional
  Human.
- Added restrained entrance, header, button, crop, and digit transitions. A
  reduced-motion media query removes meaningful duration and smooth scrolling.
- Added `/dev/styleguide` for palette, typography, controls, spacing, imagery,
  and time. The internal route is `noindex`, has no canonical alternates, and is
  excluded from the sitemap.
- Added `DESIGN_SYSTEM.md`, `IMAGE_POLICY.md`, `IMAGE_CREDITS.md`, and
  `FONT_PROVENANCE.md` so visual and licensing decisions remain reviewable.

Validation:

- `SITE_ORIGIN=https://preview.unumae.invalid npm run web:check` passes Astro
  diagnostics, lint, formatting, and the 26-page static build.
- Headless Chromium screenshots were reviewed at 320, 768, 1024, and 1440px.
  Browser measurements found no horizontal overflow at any breakpoint.
- Inter and Newsreader loaded at every width, and all page requests stayed on
  the local origin. Font assets and full licence texts total 188KB.
- Keyboard Tab focus lands on the visible skip link with a solid outline. In a
  reduced-motion browser context, animations and transitions resolve to 0.01ms.
- `npm run verify` remains green: 19 suites and 306 native tests pass.

**Exit:** achieved. The responsive component gallery is stable at every target
width, keyboard and contrast states are explicit, motion is optional, and local
fonts introduce no late swap or external request.

### Phase 3 — Marketing homepage — complete

Delivered on 23 August 2026:

- Replaced the generic landing route with a finite eight-frame editorial story:
  opening promise, premise, labelled portrait-format preview, daily sequence,
  anti-social-network manifesto, Archive, fairness proof, and closing invitation.
- Added one typed homepage content model with equivalent English, French, and
  German copy. Product language matches the Constitution and future operational
  steps are explicitly framed as the launch state.
- Built a full-height typographic opening and responsive twelve-column magazine
  layouts without a stock gradient, fake phone, testimonial, invented Human, or
  popularity metric.
- Reused the abstract CSS campaign composition and localized its caption. It is
  clearly labelled as a format preview that represents no person or story, so
  this phase adds no raster imagery requiring responsive source generation.
- Described the complete day as selected, invited, guided story, liveness plus
  human review, one global 24-hour window, and Archive—without claiming those
  pre-launch operations are currently live.
- Explained Archive discovery by time, country, or chance, never popularity,
  while preserving a Human’s right to request story removal.
- Added only truthful internal links to the selection method, Archive preview,
  and About page. The close states that no download or waitlist exists yet.

Validation:

- `npm run web:check` passes Astro diagnostics, lint, formatting, and the
  26-page static build.
- Headless Chromium screenshots were reviewed at 320, 768, 1024, and 1440px.
  All eight frames render in order with no horizontal overflow or external
  requests, and both self-hosted typefaces load.
- French and German homepages render their localized hero and manifesto without
  overflow at 768px.
- Keyboard Tab focus lands on the visible skip link with a solid outline.
  Reduced-motion animations and transitions resolve to 0.01ms.
- `npm run verify` remains green after the remote Phase 9–10 integration:
  22 suites and 364 native tests pass.

**Exit:** achieved. A quick scan communicates one Human, one global day, the
careful publication loop, the deliberate absence of social ranking, the
Archive, and the reproducible equal-chance draw.

### Phase 4 — Trust and explanation pages — complete

Delivered on 23 August 2026:

- Built `/about` as a finite mission document around ordinary people, one
  shared day, the Human Archive, guest access, participant rights, deliberate
  product limits, and an international—not centre-out—point of view.
- Built `/how-selection-works` from the binding rules: binary eligibility,
  seven-day account age, minimum age 16, opt-in and rules acceptance, a pool
  frozen at D−2, recorded pool hash and secure seed, one primary plus three
  backups, a 12-hour response window, explicit consent, one turn forever,
  liveness and human review before publication, and Quiet Day as the honest
  fallback.
- Distinguished reproducibility from public cryptographic verification. The
  recorded inputs make the ordering auditable; a public cryptographic verifier
  remains a future transparency goal and is not claimed as available.
- Published all nine approved community rules in a readable document with
  numbered anchors and a table of contents. English remains explicitly
  canonical, with complete French and German translations.
- Preserved Privacy and Terms as truthful pre-launch placeholders. Both remain
  `noindex, follow`; no unreviewed legal text or unsupported safety guarantee
  was introduced.
- Added one typed trust-content model and responsive editorial layouts shared
  across the three locales.

Validation:

- `npm run web:check` passes Astro diagnostics, lint, formatting, and the
  26-page static build.
- Headless Chromium reviewed About, selection, and community guidelines at 320,
  768, and 1440px with no horizontal overflow or external requests.
- The community page exposes nine rules and nine matching contents links at
  every target width. English, French, and German render equivalent structures.
- Both self-hosted fonts report loaded. Keyboard Tab focus lands on the visible
  skip link with a solid outline; reduced motion resolves to 0.01ms.
- Browser inspection confirms Privacy and Terms emit `noindex, follow`.
- `npm run verify` remains green: 24 suites and 399 native tests pass.

**Exit:** achieved. The principal mission, selection, consent, moderation,
Archive, conduct, and enforcement claims are specific, traceable to approved
repository policy, and free of invented legal promises.

### Phase 5 — Public Today and Archive previews — complete

Delivered on 23 August 2026:

- Rebuilt `/today` and its French and German equivalents as the canonical
  guest destination for a shared daily story. The launch state explains why no
  Human is shown; live mode supports a complete approved portrait, questions,
  a UTC countdown, Quiet Day, loading, and connection failure without requiring
  an account or app installation.
- Rebuilt `/archive` as an explanation-first chronological record, followed
  by country and year filters, explicit twelve-entry pagination, and Random
  Human discovery. There is a visible end and no ranking or infinite feed.
- Added first-class empty, no-match, loading, network-error, no-photo, and
  removed-content states. A tombstone renders only its Human number and date;
  identity, location, image path, and story fields are discarded.
- Added a typed, browser-only REST reader restricted to seven existing anonymous
  functions: today's Human, portrait elements, approved questions, Archive,
  Random Human, Archive countries, and Archive years. It cannot name a table or
  invoke another RPC.
- Kept `PUBLIC_DATA_MODE=off` as the default, producing zero data requests.
  Live mode requires an explicit public project URL and anon key; configuration
  warns that a service-role key must never be exposed.
- Resolve approved portrait objects with short-lived signed URLs. Question
  votes and country/year counts returned by the existing functions are
  deliberately ignored and never rendered.

Validation:

- `npm run web:check` passes Astro diagnostics, lint, formatting, and the
  26-page static build.
- Headless Chromium reviewed request-free launch pages at 320, 768, and 1440px,
  plus representative French and German pages, with no horizontal overflow or
  requests beyond the local origin.
- Intercepted live-reader checks cover Quiet Day, a published Today portrait,
  approved questions, Archive chronology, country filtering, no-match recovery,
  Random Human, signed portraits, network failure, and all seven allowed RPCs.
- Browser assertions confirm Remember/vote totals and country/year counts are
  absent. A tombstone ignores supplied identity, city, and portrait fields and
  displays only its number, date, and neutral removal explanation.
- `npm run verify` remains green: migrations pass, 28 suites pass, and all 481
  native tests pass.

**Exit:** achieved. Shared Today links explain themselves without the app, the
Archive remains finite and non-competitive, and live reads cannot exceed the
reviewed anonymous function allowlist.

### Phase 6 — Localization, sharing, and discovery — complete

Delivered on 23 August 2026:

- Audited the existing English, French, and German route parity and kept English
  canonical with unprefixed URLs. Each public route has three locale alternates
  plus `x-default`, and the localized navigation preserves the current page.
- Added localized Open Graph and X large-card metadata to every public route:
  route-specific titles and descriptions, canonical URL, locale and alternates,
  1200×630 image, dimensions, MIME type, and accessible image description.
- Added Schema.org JSON-LD graphs containing the Unumae organization, website,
  and localized page. About uses `AboutPage`, the Archive uses
  `CollectionPage`, and all other public routes use `WebPage`.
- Added an original SVG favicon, 32px browser icon, 180px Apple touch icon,
  192px and 512px web-manifest icons, and a browser-mode web manifest. No native
  App Store icon decision was implied or replaced.
- Created original, localized EN/FR/DE social images with repository fonts and
  no person or story. The guarded Human template follows the required Today’s
  Human, first name, country, approved quote, and product-tagline composition.
- Made the Human template reject anything that is not currently live, quote
  approved, non-removed, complete, and within the reviewed layout limits.
  Candidate, invitation, draft, review, completed, and removed content cannot
  enter a generated Today preview.
- Updated stale pre-review metadata for the now-published Privacy and Terms
  pages and restored all localized legal routes to the sitemap. Every
  `/dev/…` review/render route remains `noindex`, has no social metadata or
  canonical URL, and is excluded from the sitemap.
- Deliberately withheld App Store banner and universal-link metadata. The real
  App Store ID, deployed HTTPS origin, Apple Team ID, and verified association
  file are still unavailable; shared URLs therefore remain complete web
  fallbacks instead of advertising an unverified deep link.

Validation:

- `SITE_ORIGIN=https://preview.unumae.invalid npm run web:check` passes Astro
  diagnostics, lint, formatting, and the 30-page static build.
- A static-output audit checks all 24 public locale/route combinations for one
  canonical, complete `hreflang` set, localized Open Graph locale, X card,
  absolute secure social image, parseable JSON-LD, and correct page schema.
- Sitemap inspection confirms localized Privacy and Terms routes are present
  and every internal route is absent. Internal HTML contains `noindex` and no
  canonical, Open Graph, X, or structured discovery metadata.
- Browser measurements confirm all three cards render at 1200×630 with both
  self-hosted fonts, no clipped localized display copy, and a clean Human
  template. PNG headers confirm exact card and icon dimensions.
- Direct gate checks accept a valid live/approved card and reject review,
  unapproved, removed, and oversized content. Static HTML contains no App Store
  or custom-scheme metadata before association is verified.
- `npm run verify` remains green: 26 migrations pass, 28 suites pass, and all
  481 native tests pass.

**Exit:** achieved. Every public locale is independently indexable without
duplicate ambiguity, shared links produce complete localized previews, and no
Human content can enter social metadata before its approved live cycle.

### Phase 7 — Measurement, accessibility, and quality — complete

Delivered on 23 August 2026:

- Added an explicit three-event marketing funnel allowlist for opening the
  selection explainer, Archive, or mission page. Measurement is absent unless a
  same-origin endpoint is configured, and its payload contains only event,
  locale, and source route.
- Set no analytics cookie, installation ID, local storage, or session storage;
  honored Global Privacy Control and Do Not Track; and structurally excluded
  Humans, stories, questions, Archive entries, impressions, Remember activity,
  and popularity signals. Added the localized disclosure to the Privacy page.
- Added a single repeatable `npm run web:quality` gate for Astro and TypeScript
  diagnostics, lint, formatting, production build, HTML validation, internal
  links, heading order, discovery metadata, sitemap integrity, privacy rules,
  browser accessibility, responsive behavior, and Lighthouse.
- Added Playwright coverage using Chrome, Edge, Firefox, desktop Safari, and
  iPhone Safari profiles backed by current bundled Chromium, Firefox, and
  WebKit engines. Added delayed-resource coverage for low bandwidth and
  Lighthouse simulated-mobile throttling.
- Checked keyboard skip navigation, main focus, landmark names and reading
  structure, one-H1 heading order, axe WCAG 2.2 A/AA rules, 200% layout
  equivalence, contrast, reduced motion, and 44px touch targets across every
  public route where applicable.
- Fixed defects exposed by the new gate: distinct localized names for primary
  and legal navigation, programmatically focusable skip targets, transient
  animation contrast failures, undersized navigation targets, empty dynamic
  headings, invalid placeholder image markup, and German heading overflow on
  iOS.

Validation:

- HTML Validate and the static audit pass all 30 generated HTML files and all
  24 public locale/route combinations, including local links, headings,
  canonical/alternate metadata, social tags, JSON-LD, and sitemap membership.
- The browser matrix passes all applicable checks across five profiles,
  including axe scans of the five representative route structures and touch
  targets across all 24 iOS public routes.
- Lighthouse passes all eight English route types. Performance ranges from
  98–100; Accessibility, Best Practices, and SEO are 100 on every route.
- The quality-build analytics test emits exactly the three approved fields,
  verifies empty cookies and browser storage, and proves both Global Privacy
  Control and Do Not Track suppress delivery.
- `npm run verify` remains green after rebasing onto the native Phase 15 work:
  28 migrations pass, 29 suites pass, and all 492 native tests pass.

**Exit:** achieved. The full gate is repeatable from one command, every score
meets the 95 target, and no critical accessibility, SEO, privacy, link,
cross-engine, low-bandwidth, or responsive defect remains.

### Phase 8 — Domain and production launch

- Build a repeatable static deployment for the Ubuntu host, including cache
  headers, compression, immutable hashed assets, and safe fallback behavior.
- After purchase, configure `unumae.app` and `www.unumae.app`, choose one
  canonical host, redirect the other, and issue TLS certificates.
- Configure security headers, monitoring, uptime checks, error logging, and a
  rollback path.
- Verify sitemap indexing, social-card caches, all locale routes, App Store URL,
  privacy URL, support URL, and Apple universal-link association.

**Exit:** `https://www.unumae.app` is secure, observable, fast, indexable, and
can be rolled back without touching the native app backend.

## 6. Release slices

| Release | Included phases | Outcome |
| --- | --- | --- |
| **A — Beautiful pre-launch site** | 1–4 | Full homepage, mission, fairness, guidelines, honest launch state |
| **B — Shareable product surface** | 5–6 | Public Today/Archive previews, localized SEO, social cards, deep links |
| **C — Production launch** | 7–8 | Audited quality, measurement, domain, deployment, monitoring |

Release A should be built first. It provides a complete marketing presence
without waiting for real Humans, an App Store listing, the domain purchase, or
the full public archive.

## 7. Inputs needed later, not blockers for Release A development

- Confirmed App Store launch state and final listing URL.
- Approved privacy policy and Terms of Service.
- Decision on whether to collect pre-launch email addresses.
- Purchased domain and DNS access.
- Consent-cleared real Human portraits when the connected `/today` experience
  replaces preview artwork.

## 8. Definition of done

The marketing site is done when it is beautiful without competing with the
people, culturally current without chasing trends, and clear without requiring
the app. It must remain fast on weak connections, accessible to a global
audience, truthful about the product's launch state, and structurally unable to
turn Humans into a ranked content feed.
