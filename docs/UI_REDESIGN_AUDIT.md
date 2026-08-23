# Unumae app UI audit

Audit date: 2026-08-23

## Production routes and states

- `/(tabs)` — Today's Human; loading, quiet day, request failure, guest/authenticated actions, questions, Remember, share, report, selection standing.
- `/archive` — archive index; anniversary, random Human, country/year filters, loading, filtered empty, archive empty, request failure.
- `/human/[id]` — archived portrait; loading, request failure, not found, removed-person tombstone, questions, share.
- `/(tabs)/settings` — guest, incomplete account, and signed-in profile states; experience, language, privacy/safety, product information, moderator and account actions.
- `/settings/profile` — profile editor; loading, form validation, save error.
- `/settings/appearance` — system, light, and dark appearance modes.
- `/settings/notifications` — category switches; unavailable permission/build state, registration error and success toast.
- `/settings/privacy` — city visibility, data export, export error/success, data-collection explanation.
- `/settings/eligibility` — loading, eligible, temporarily ineligible, permanently ineligible, participation toggle.
- `/settings/community-rules` — rules, unauthenticated/incomplete profile, accepted and acceptance-error states.
- `/settings/account` — delete explanation, confirmation, busy and error states.
- `/how-selection-works` — selection explanation, live statistics, country representation.
- `/if-you-are-chosen` — invitation and publication process explanation.
- `/(auth)/sign-in` — Apple availability states, email form, field error, guest continuation.
- `/(auth)/verify` — code entry, invalid-code error and resend.
- `/(onboarding)/profile` — three-step product introduction and minimal profile form.
- `/(selection)/invitation` — loading, no invitation, active/urgent/expired invitation, accept/decline errors.
- `/(selection)/portrait` — loading, not selected, photo permission/upload, autosaved answers, incomplete/ready submission, errors and success toast.
- `/admin` — unauthorized, loading, portrait/question/report queues, retention signals and operations.
- `/+not-found` — unknown route recovery.
- `/today` — stable universal-link redirect.

Development-only routes under `/dev` remain sealed by `__DEV__` and inherit the shared system.

## Findings before redesign

- Today was a single flat vertical stack. The portrait did not create a meaningful hero or distinguish the live Human from an archived profile.
- Archive entries and questions resembled database rows: thin dividers, small imagery, weak state communication, and little emotional hierarchy.
- Remember used the same generic button treatment as any other action.
- Settings mixed raw links, plain text, buttons and a language table without a consistent row model. Profile identity had almost no visual presence.
- Auth and onboarding were white form pages without the wordmark, product proposition, or narrative onboarding.
- Secondary educational, privacy, eligibility, notification, account and selection pages repeated one-off margins and hairline sections.
- Most screens used the same white background level, creating a cold, unfinished appearance and excessive perceived empty space.
- Typography had limited hierarchy, headings were not consistently paired with context, and editorial answers were visually equivalent to utility copy.
- Icons appeared only in tabs; several actions used text glyphs such as triangles, arrows and checkmarks.
- Theme tokens lacked layered surfaces, semantic state surfaces, strong borders and the full cobalt/indigo/violet brand family.
- Failure states were missing from Today, Archive and archived-Human queries even though the query hooks exposed them.
- Appearance followed the system only; users had no explicit light/dark choice.

## Redesign response

The redesign centralizes semantic surfaces, page/section headers, article cards, grouped settings rows, pills, icons and branded heroes. It uses portrait-led editorial composition for Humans, conversational cards for questions, a distinct private-archive action for Remember, grouped native-style utility pages, preserved-layout skeletons, and intentional light/dark palettes. Existing routes, backend calls, query keys, data contracts and product-constitution constraints remain intact.
