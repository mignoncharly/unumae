# Where each page lives

Two surfaces, one product. This file says which owns what, so the same text
never ends up maintained in both.

## The rule

| Surface | Owns | Why |
| --- | --- | --- |
| `website/` (Astro, `unumae.app`) | Marketing, About, Privacy, Terms, Community guidelines, public Today and Archive | It has to be readable by somebody who has installed nothing. That is the whole point of a shared link. |
| The app (`src/app/`) | Everything a signed-in person does, plus two pages that are also on the site | Reasons below. |

## The two deliberate duplicates

**How selection works** exists in both, and that is not an oversight.
Article 12 requires the product to be able to explain why a person was
selected. That must not depend on a browser being installed, a network being
up, or a domain being deployed — so the app carries its own copy, generated
from `src/constants/constitution.ts`, which is itself asserted against the
Product Constitution.

**Community guidelines** exist in both because accepting them writes
`accepted_rules_at`, and the text somebody agrees to has to be the text the app
showed them. A link out to a page that could change between the reading and the
tap is not consent.

On the site, About, How selection works and the Community guidelines are richer
than a list of sections: they live in `website/src/content/trust.ts` and are
rendered by `TrustPage`. Only Privacy and Terms use `legal.ts` and `RoutePage`.

Everything else the app links out to, through `src/constants/links.ts`.

## What the app no longer carries

`about`, `legal/privacy` and `legal/terms` were briefly app routes in Phase 11,
before the website existed. They were removed once it did: their text was moved
to `website/src/content/legal.ts` in all three languages, and Settings now
links out.

The removal was the right way round — the site is the surface a stranger
reaches first, and a privacy policy that only exists inside an app is one that
nobody can read before installing it.

## Keeping the two in step

The site's legal text was generated once from the app's locale files, so the
three languages started identical. From here **the site owns it**: edit
`website/src/content/legal.ts`, not the app.

If the app ever needs to show that text again — offline, say — generate it from
the site rather than re-typing it, and say so in the commit.

## Commands

```bash
npm run web:dev      # the site, locally
npm run web:build    # static output in website/dist
npm run web:check    # astro check, lint, format, build
npm run verify       # the app: typecheck, lint, format, migrations, tests
```
