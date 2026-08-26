# Marketing-site quality gate

Run the complete Phase 9 gate from the repository root:

```bash
npm run web:quality
```

The command runs Astro and TypeScript diagnostics, lint, formatting, a
production quality build, HTML validation, the static route/link/metadata
audit, each browser profile in an isolated process, and Lighthouse. Browser
failures do not prevent Lighthouse from running; all failures are aggregated
and the overall command remains red.

Each Lighthouse route receives a fresh temporary Chrome profile and process.
This prevents simulated-mobile renderer work from degrading later route scores
or leaving the final audit unable to terminate, especially on Windows.

Firefox qualification runs in the required Linux CI job. The local Windows
orchestrator skips that one renderer because its Playwright subprocess can hang
outside the test timeout and cannot be terminated reliably; Chromium and both
WebKit profiles still run locally. This isolates infrastructure behavior
without weakening the required remote gate.

Install the browser engines once on a new machine:

```bash
npm --prefix website exec -- playwright install chromium firefox webkit
```

## Coverage

- Every one of the 24 core locale/route combinations plus three representative
  person-specific Human snapshots is checked for a
  reachable document, one main landmark and H1, responsive bounds, local links,
  heading order, canonical and alternate URLs, social metadata, JSON-LD, and
  sitemap membership. Human snapshots additionally require localized
  ProfilePage metadata and a generated Open Graph image.
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
