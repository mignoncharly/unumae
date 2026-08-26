# Phase 9 — website metadata, CSP, and quality gate

Phase 9 is implemented locally. Publishing and production smoke evidence still
belong to the release process.

## Human discovery without JavaScript

Live website builds enumerate the Archive through its anonymous, read-only RPC
boundary. Each non-removed published Human receives localized static routes in
English, French, and German. The HTML includes the Human's display name,
Archive number, publication date, location when public, portrait answers,
approved questions, canonical and alternate URLs, Open Graph/X metadata, and a
Schema.org `ProfilePage` whose `mainEntity` is a `Person`.

Social cards are rendered to 1200×630 PNGs from published name, country, number,
and date. Candidate, invited, draft, review, and removed records cannot enter
the snapshot loader. Generic Human routes remain the safe fallback for a newly
published or removed record until the next build.

The browser refreshes snapshots through the same public reader. Every RPC and
signed-photo request has an eight-second timeout, retries at most three times,
and retries only network failures or transient HTTP statuses. A refresh failure
does not replace a valid static snapshot with an error.

## CSP and public claims

The production Nginx policy uses `script-src 'self'` and `style-src 'self'`
without `unsafe-inline`. Astro's executable scripts and styles are emitted as
same-origin assets. JSON-LD remains inert structured-data markup.

The static audit rejects “verified human” and its French/German equivalents.
Public copy may describe confirmed contact, provider binding, genuine-app/device
attestation, moderation review, or reproducible fairness, but never uniqueness
of a person.

## Reliable quality orchestration

Chromium/Chrome, Chromium/Edge, Firefox, WebKit/Safari, and iPhone Safari run in
separate processes. Firefox receives bounded renderer retries in Linux CI and
is skipped by the Windows orchestrator, where its subprocess can hang outside
Playwright's test timeout. Desktop Safari's
skip-link test reflects its host keyboard-navigation preference, while iOS does
not claim a hardware-Tab contract. The analytics navigation test waits for the
actual beacon request rather than racing page teardown.

Lighthouse always runs after browser-project failures when a fresh build exists.
Each route receives a fresh temporary Chrome profile and process so renderer
state cannot degrade or hang later audits. The orchestrator reports all failures
and exits non-zero. CI installs the three Playwright engines and runs this
complete gate rather than the former static-only website verification.

## Verification

- `npm --prefix website run check`
- `npm --prefix website run lint`
- `npm --prefix website run format:check`
- `npm --prefix website run build:quality`
- `npm --prefix website run quality:static`
- `npm --prefix website run quality`
- Root and website dependency audits

The website dependency audit is clean. The root Expo tree still reports only
moderate build-tool findings; npm proposes incompatible Expo downgrades rather
than a compatible patched SDK 57 path, so Phase 9 does not apply that unsafe
change.
