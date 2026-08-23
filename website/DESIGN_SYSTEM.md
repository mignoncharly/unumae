# Website design system

The web system translates the native direction—editorial, documentary, premium,
calm—into semantic HTML and CSS. It intentionally does not share native
components: the two surfaces share principles and values, not implementation.

## Art direction

- Warm monochrome lets a future consented portrait carry all visual colour.
- Newsreader Variable supplies the culture-magazine voice; Inter Variable keeps
  navigation and long explanatory copy direct and readable.
- The grid expands from one column at 320px to twelve columns on larger screens.
  Reading measures remain capped even when the canvas reaches 1440px.
- Controls are explicit, rounded only enough to feel approachable, and at least
  44px high. Links remain visibly links.
- The site is light-only for the first release. A dark theme would add testing,
  image-treatment, and contrast complexity without clarifying the premise.

## Motion

Everyday transitions use the native 100/180/260/420ms duration scale. The 900ms
ceremonial duration appears only in the abstract campaign crop, never as a live
draw or roulette metaphor. Entrance effects change opacity and transform only,
so they do not move surrounding layout.

`prefers-reduced-motion: reduce` reduces every animation and transition to
0.01ms and disables smooth scrolling. Nothing requires motion to be understood.

## Accessibility

- Page structure uses landmarks, one principal heading, and a skip link.
- Text and controls use high-contrast ink values; `prefers-contrast: more`
  strengthens secondary ink, rules, and control borders.
- Keyboard focus uses a three-pixel ink outline with clear offset.
- Numeric displays use tabular system-monospace glyphs so countdown widths do
  not change.
- Local fonts use `font-display: optional` and critical faces are preloaded,
  avoiding a late font swap.

## Internal gallery

`/dev/styleguide` displays palette, type, controls, spacing, the abstract image
study, and countdown. It is `noindex`, has no canonical alternates, and is
excluded from the sitemap. It is the review surface for 320, 768, 1024, and
1440px breakpoints.
