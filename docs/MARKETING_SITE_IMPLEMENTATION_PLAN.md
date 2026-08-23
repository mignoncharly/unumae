# Unumae marketing site — implementation plan

**Status:** Phases 0–3 complete; Phase 4 next
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

### Phase 4 — Trust and explanation pages

- Build `/about` around the human mission and the deliberate limits of the
  product.
- Build `/how-selection-works` from constitutional constants: frozen pool,
  equal chance, recorded seed, three backups, 12-hour acceptance window, one
  turn forever, and moderation before publication.
- Publish `/community-guidelines` from the approved rules in a readable,
  navigable format.
- Add `/privacy` and `/terms` only from reviewed legal copy. Until then, these
  routes must be honest placeholders and must not imply policies that do not
  exist.

**Exit:** the principal trust claims are specific, consistent with the app,
and contain no unsupported legal or safety promises.

### Phase 5 — Public Today and Archive previews

- Build `/today` as the canonical destination for shared daily links.
- Initially show the launch state or Quiet Day honestly; once approved public
  data exists, read only through the current anonymous Supabase functions.
- Build `/archive` as a marketing explanation first, then progressively enable
  chronological, country, year, and Random Human discovery.
- Preserve tombstones for removed Humans and never expose ranking controls or
  Remember totals.
- Ensure empty, loading, network-error, and removed-content states are designed
  as first-class states.

**Exit:** visitors can understand a shared link without installing the app,
and public reads reveal no data beyond the existing anonymous allowlist.

### Phase 6 — Localization, sharing, and discovery

- Translate site copy into French and German and add locale-aware navigation.
- Add canonical URLs, `hreflang`, Open Graph, X card metadata, structured data,
  favicon/app icons, and per-route social descriptions.
- Create a share-card template aligned with the specified format: Today's
  Human, first name, country, one approved quote, and the product tagline.
- Add universal/deep-link metadata once the domain and Apple association file
  can be verified. Web remains the fallback when the app is absent.
- Ensure social previews never expose content before its approved live cycle.

**Exit:** every locale is indexable without duplicate-content ambiguity, and a
shared link produces a complete, attractive preview.

### Phase 7 — Measurement, accessibility, and quality

- Add privacy-conscious analytics only for agreed funnel events; never track or
  display a Human's popularity.
- Test keyboard navigation, landmarks, heading order, screen readers, zoom,
  contrast, reduced motion, and touch targets against WCAG 2.2 AA.
- Add automated link, type, build, HTML, metadata, and accessibility checks.
- Test on current Safari/iOS, Chrome, Firefox, and Edge, plus low bandwidth.
- Target Lighthouse scores of 95+ for Performance, Accessibility, Best
  Practices, and SEO on the static marketing routes.

**Exit:** checks are repeatable from one command and no critical accessibility,
SEO, privacy, or responsive defect remains.

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
