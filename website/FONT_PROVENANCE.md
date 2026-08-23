# Website font provenance

Both families are self-hosted WOFF2 variable fonts. No request is made to a font
CDN, and `font-display: optional` prevents a late font swap from shifting the
layout. The complete licence texts ship beside the font files in `public/fonts`.

| Role                        | Family              | Source package                    | Version | Licence                   |
| --------------------------- | ------------------- | --------------------------------- | ------- | ------------------------- |
| Display and editorial prose | Newsreader Variable | `@fontsource-variable/newsreader` | 5.3.0   | SIL Open Font License 1.1 |
| UI and body copy            | Inter Variable      | `@fontsource-variable/inter`      | 5.3.0   | SIL Open Font License 1.1 |

Only the Latin upright subsets are used for Inter. Newsreader includes Latin
upright and italic subsets. These cover the first-release English, French, and
German interface copy; future locales must add the appropriate subsets rather
than falling back silently.
