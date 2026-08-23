# Marketing-site quality gate

Run the complete Phase 7 gate from the repository root:

```bash
npm run web:quality
```

The command runs Astro and TypeScript diagnostics, lint, formatting, a
production quality build, HTML validation, the static route/link/metadata
audit, the browser matrix, and Lighthouse. It fails on any result below the
documented bar.

Install the browser engines once on a new machine:

```bash
npm --prefix website exec -- playwright install chromium firefox webkit
```

## Coverage

- Every one of the 24 public locale/route combinations is checked for a
  reachable document, one main landmark and H1, responsive bounds, local links,
  heading order, canonical and alternate URLs, social metadata, JSON-LD, and
  sitemap membership.
- Axe checks representative page structures against WCAG 2.2 A and AA. The
  browser suite also checks keyboard skip navigation, uniquely named
  landmarks, a screen-reader-compatible reading structure, reduced motion,
  200% layout equivalence, and 44 CSS-pixel touch targets on every public iOS
  route.
- Playwright runs current bundled Chromium, Firefox, and WebKit engines with
  Chrome, Edge, desktop Safari, and iPhone Safari profiles. These are
  deterministic Linux regression proxies; launch qualification should still
  include a short spot check in the branded stable browsers and VoiceOver on
  Apple hardware.
- A delayed-resource run protects the request-free core experience on low
  bandwidth. Lighthouse adds simulated mobile throttling and enforces 95 or
  better for Performance, Accessibility, Best Practices, and SEO on all eight
  English route types.

## Measurement contract

Marketing measurement is off unless `PUBLIC_ANALYTICS_ENDPOINT` contains a
same-origin path. When enabled, only these events are accepted by the client:

- `selection_explainer_opened`
- `archive_opened`
- `mission_opened`

The payload contains exactly `event`, `locale`, and `source`. The client
sets no cookie or browser-storage identifier, sends no impression or
Human-level event, and disables itself when Global Privacy Control or Do Not
Track is enabled. The receiving endpoint must retain these anonymous events no
longer than 90 days and must not enrich them with user or popularity data.
