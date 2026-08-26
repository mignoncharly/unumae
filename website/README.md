# Unumae website

Static Astro marketing and sharing surface for Unumae. The native Expo app
remains at the repository root; this package builds independently to `dist/`.

## Commands

Run these from the repository root:

```bash
npm run web:dev
npm run web:check
npm run web:build
npm run web:quality
```

Or run the equivalent package scripts from this directory. The development
server follows Astro background mode; use `npm run dev:status` and
`npm run dev:stop` to inspect or stop it.

## Canonical origin

`SITE_ORIGIN` controls canonical URLs, `robots.txt`, and the sitemap. It defaults
to `http://localhost:4321` for local builds. Copy `.env.example` to `.env` when a
different working origin is needed. Do not set the production domain until it
has been purchased and configured.

## Routes and languages

English routes are unprefixed. Matching French and German routes live below
`/fr` and `/de`. Shared navigation, page metadata, product facts, and route copy
are defined in `src/content/site.ts`.

## Public Today and Archive data

`/today` and `/archive` default to an honest, request-free pre-launch state.
To connect them to an approved Supabase project, set
`PUBLIC_DATA_MODE=live`, `PUBLIC_SUPABASE_URL`, and
`PUBLIC_SUPABASE_ANON_KEY`. The key is the public anon key; a service-role key
must never be exposed through a `PUBLIC_` variable.

The public reader is intentionally limited to the anonymous RPC allowlist used
by these pages: today's Human, published portrait elements, approved questions,
Archive entries, Random Human, countries, and years. It does not read tables,
display Remember totals, or expose country/year counts. Portrait paths are
resolved through short-lived signed URLs.

When live data is enabled, each release generates static HTML snapshots for
published Human links. Their name, Archive number, date, portrait, localized
canonical metadata, structured data, and social card are useful without
JavaScript. The browser then refreshes the publication-gated data with bounded
timeouts and retries. Removed or newly published records fall back to the
generic guarded page until the next release build.

## Sharing and discovery

Every public route emits localized canonical and alternate links, Open Graph
and X large-card metadata, and a Schema.org graph. Published Human snapshots
receive person-specific ProfilePage metadata and raster social cards generated
only from the anonymous publication boundary. Generic EN, FR, and DE cards are
used elsewhere, so no candidate or draft Human can enter a social cache. The
guarded quote template remains reviewable at `/dev/share-card` and only accepts
live content with an explicitly approved quote.

The site does not emit an App Store banner or universal-link association yet.
Those require the real App Store identifier, deployed HTTPS origin, Apple Team
ID, and a verified association file. Until then every shared URL remains a
complete web fallback.

## Privacy-conscious measurement

Marketing measurement is disabled unless `PUBLIC_ANALYTICS_ENDPOINT` is set
to a same-origin path. The allowlist contains only navigation to the selection
explainer, Archive, and mission page. Payloads contain the event, interface
language, and source route—no cookie, identifier, Human, story, question,
Archive entry, impression, or popularity signal. Global Privacy Control and Do
Not Track disable delivery.

## Quality gate

`npm run web:quality` from the repository root checks types, lint, format,
build output, HTML, links, metadata, accessibility, responsive behavior,
privacy signals, five browser profiles, low bandwidth, and Lighthouse’s four
categories. See `QUALITY.md` for the browser-install command and exact
coverage.

## Design review

Internal `/dev/…` routes are excluded from indexing and the sitemap.
See `DESIGN_SYSTEM.md`, `IMAGE_POLICY.md`, `IMAGE_CREDITS.md`, and
`FONT_PROVENANCE.md` for the decisions behind it.
