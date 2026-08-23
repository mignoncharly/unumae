# Unumae website

Static Astro marketing and sharing surface for Unumae. The native Expo app
remains at the repository root; this package builds independently to `dist/`.

## Commands

Run these from the repository root:

```bash
npm run web:dev
npm run web:check
npm run web:build
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

## Design review

The internal `/dev/styleguide` route is excluded from indexing and the sitemap.
See `DESIGN_SYSTEM.md`, `IMAGE_POLICY.md`, `IMAGE_CREDITS.md`, and
`FONT_PROVENANCE.md` for the decisions behind it.
