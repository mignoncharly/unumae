# Unumae UI/UX design context

**Audit basis:** repository state on 2026-08-27. Actual route and component code is the source of truth where it differs from prose documentation. This is an analysis artifact, not a redesign specification.

## 1. Executive product definition

### CURRENT IMPLEMENTATION

Unumae is a deliberately finite, guest-readable social storytelling product built around the promise **“8 billion people. One today.”** One eligible ordinary person is randomly selected for a global 24-hour UTC cycle. After explicit acceptance, a guided portrait, and human moderation, that person becomes **Today's Human**. Everyone can read the portrait and approved questions; signed-in people can propose questions, vote “Ask this,” privately Remember the Human, report, block, and opt into the draw. Past Humans form a chronological Archive.

The app has no general feed, follower graph, direct messages, groups, public Like count, popularity ranking, streaks, badges, or paywall. It is intentionally not optimized for continuous consumption.

### PRODUCT INTENT

The binding `PRODUCT_CONSTITUTION.md` defines Unumae as a daily encounter with one ordinary person: editorial, documentary, premium, calm, international, privacy-conscious, manually moderated, and fair in selection. The person—not interface chrome or metrics—must remain the star.

Its defining product sequence is:

```text
selection → consent → guided portrait → moderation → Today's Human → moderated Q&A → Archive
```

This repository and the Product Constitution are the authoritative product definition for the design handoff. A redesign must improve that experience without expanding it into a conventional social network.

## 2. Audience and value

### CURRENT IMPLEMENTATION

The app serves three roles:

- **Guest reader:** meets Today's Human, reads questions and answers, explores the Archive, and shares without an account.
- **Participating member:** creates a minimal profile, asks and votes on questions, Remembers Humans privately, reports/blocks, and optionally enters the selection pool.
- **Selected Human:** accepts or declines an invitation, authors a guided portrait, waits for review, answers approved questions during the live day, and later may request Archive removal.
- **Moderator/operator:** reviews portraits, questions, reports, assurance flags, appeals, removal requests, analytics, and operational health.

The emotional value is attentive discovery of one real person at a time. The functional value is a safe, fair, inspectable route from ordinary member to a globally visible 24-hour portrait.

## 3. Existing feature set

### CURRENT IMPLEMENTATION

**Discovery and storytelling**

- One live Human per 24-hour UTC cycle, with a countdown.
- 4:5 portrait photograph, first/display name, country, optional city, Human number, optional Founding Human note.
- Seven guided text responses; the first is given slightly stronger editorial treatment.
- Machine translations in EN/FR/DE are additive; original words remain accessible.
- Quiet Day and removed-Human states.

**Questions and personal actions**

- Read approved questions and optional answers.
- Authenticated users propose a question of up to 180 characters.
- Upvote-only “Ask this” action; question vote totals are public.
- Today's Human may answer or update approved questions during the live window.
- Private Remember/unremember library; no public Remember count.
- Native image-card/text sharing.
- Report portrait/question/profile and block its author.

**Archive**

- Yesterday, anniversaries, Random Human, country/year filters, recent chronological entries, explicit “Load earlier,” and private Remembered Humans.
- Archived Human detail reuses the portrait and questions presentation; voting is disabled.
- Removed entries become identity-free tombstones retaining only number/date.

**Account and selection**

- Sign in with Apple where supported and email one-time-code authentication; guest continuation.
- Three-step introduction/profile onboarding.
- Editable profile, language and appearance preferences, notification categories, privacy controls, export, appeals, blocked users, Archive removal, and asynchronous account deletion.
- Explicit selection opt-in, transparent eligibility reasons, app/device attestation, invitation acceptance/decline, portrait authoring and moderation status.
- Public selection methodology and aggregate representation statistics.

**Operations**

- Internal moderator console for queues, assurance review, appeals/removals, product signals, job history, alerts, and integrity/balance monitoring.
- First-party bounded analytics; no advertising or cross-app tracking.

**Explicit product and implementation boundaries**

- The design AI must not invent public member profiles, followers/connections, communities, impact posts, testimonies, generalized posts, comments/threads, direct messaging, feeds, badges, points, leaderboards, or other conventional social-network mechanics.
- Search, subscriptions/paywall, camera capture, precise device location, and audio/video portraits are not implemented. Android launch verification is deferred.

## 4. Navigation architecture

### CURRENT IMPLEMENTATION

Expo Router supplies a root stack and nested route groups. Root headers are disabled; screens render their own page headers. The persistent main navigation is a three-item bottom tab bar:

```text
App root
├── Main tabs
│   ├── Today                       /
│   ├── Archive                     /archive
│   └── You                         /settings
├── Authentication (modal)
│   ├── Sign in                     /(auth)/sign-in
│   └── Verify email code           /(auth)/verify
├── Onboarding (modal, no swipe dismissal)
│   └── Profile onboarding          /(onboarding)/profile
│       ├── Step 1: The idea
│       ├── Step 2: The philosophy
│       └── Step 3: Profile form
├── Selection stack
│   ├── Invitation                  /(selection)/invitation
│   ├── Build portrait              /(selection)/portrait
│   ├── Answer questions            /(selection)/questions
│   └── Selection status            /(selection)/status
├── Human detail                    /human/[id]
├── Remembered Humans               /archive/remembered
├── Settings detail                 /settings/*
├── How selection works             /how-selection-works
├── If you are chosen               /if-you-are-chosen
├── Moderator console               /admin
└── Not found                       /+not-found
```

`/today` is a compatibility/deep-link redirect to the Today tab, not a visual screen. Four `/dev/*` routes are development-only component/design diagnostics and redirect to Today in release builds.

Global routing gates operate above the navigator:

- **OnboardingGate:** signed-in users without a profile must complete onboarding.
- **AccountStatusGate:** suspended, banned, or deletion-pending users are sent to Restricted Account and private caches are cleared.
- **JourneyGate:** presents a new invitation or unfinished portrait at the appropriate time.
- **NotificationCoordinator:** maps notification taps/actions to Today, Invitation, Archive, or a Human detail.
- **OfflineNotice:** appears above every route when disconnected.

Guests are first-class readers. Authentication is requested when they attempt a member-only action, not before they can see Human stories.

## 5. Major user journeys

### CURRENT IMPLEMENTATION

1. **Guest discovery:** launch → Today → read portrait/questions → share or visit Archive → open archived Human. Asking, voting, Remembering, reporting, or entering the draw prompts sign-in where required.
2. **New member:** Sign in with Apple or enter email → verify code if email → onboarding idea → philosophy → profile form → Today → accept rules/attest/opt in as needed for eligibility.
3. **Returning member:** launch → restored session and Today → Journey card if applicable → question/Remember/share/report → Human detail → back to the prior tab stack.
4. **Archive discovery:** Archive → Yesterday/anniversary/random/filter/recent → Human detail → Remember/share/report → back to Archive; Remembered library is signed-in/private.
5. **Selected Human:** selected notification/gate → invitation countdown → accept → start/resume portrait → photo and at least five valid answers → submit → manual review → wait for live → answer approved questions → Archive.
6. **Account/privacy:** You → privacy/profile/eligibility/notifications/etc. → change a preference, export data, appeal, request removal, block/unblock, sign out, or request deletion.
7. **Moderation/operations:** moderator-only You link → console tab → review or resolve queue item → toast/refreshed queue; monitor analytics, fairness, jobs, and alerts.

The detailed flow diagrams are in `UNUMAE_USER_FLOWS.md`.

## 5A. Screen relationships

### CURRENT IMPLEMENTATION

| Screen | Entry points | Main action | Secondary actions | Leads to |
| --- | --- | --- | --- | --- |
| Today | Launch, Today tab, `/today`, daily push, back | Read Today's Human | Translate, ask/vote, Remember, share, report/block | Auth, Archive, selection routes |
| Archive | Archive tab, Quiet Day, fallback notification | Open a past Human | Yesterday, anniversary, random, filters, Remembered, Load earlier | Human detail, Remembered |
| You | You tab | Choose account/journey destination | Language, sign out, legal links | Auth, Onboarding, all settings, education, Admin |
| Sign in | Protected action, You guest card | Apple or email authentication | Continue guest/dismiss | Verify, Onboarding, previous screen |
| Verify | Email sign-in | Verify OTP | Resend/back | Onboarding or prior app flow |
| Profile onboarding | First authenticated session without Profile | Create Profile | Navigate introduction; opt in/out; deletion | Today, Delete account |
| Invitation | Selected push/gate/Journey | Accept or decline | Read deadline/reassurance | Portrait, Today |
| Portrait builder | Accepted invitation/Journey/Status | Create and submit portrait | Pick photo, autosave, resume | Selection status |
| Answer questions | Live Journey/Status | Publish/update optional answer | Skip/back | Selection status |
| Selection status | Journey cards, Portrait completion | Continue current stage | Read waiting/archive/rejection | Invitation, Portrait, Questions, Today/Archive |
| Archived Human | Archive/Remembered/random/anniversary/link/push | Read portrait | Translate, Remember, share, report/block | Auth or back to entry context |
| Remembered Humans | Archive member section | Open remembered Human | Load earlier/back | Human detail, Archive |
| Edit profile | You identity card/row | Save Profile | Change country/languages/city/bio | You |
| Eligibility | You/profile context | Resolve gate or toggle participation | Attest/review; education | If you are chosen |
| Notifications | You | Enable/toggle category | Permission recovery | Native settings; later notification routes |
| Privacy | You | Change city visibility/export | Open safety/removal tools | Blocked, Appeals, Archive removal, share sheet |
| Community rules | You/Eligibility | Accept rules | Read/back | Eligibility/previous |
| How selection works | You/Eligibility/public context | Read fairness explanation | Inspect live stats | Previous screen |
| If you are chosen | You/Eligibility/selection context | Read process | Back | Previous screen |
| Appearance | You | Select system/light/dark | Back | You |
| Delete account | You/Onboarding/Restricted | Request/complete deletion | Reauthenticate/retry | Today after completion |
| Blocked users | Privacy | Review/unblock | Back | Privacy |
| Appeals | Privacy/Restricted | Submit appeal | Review resolution | Previous screen |
| Archive removal | Privacy | Request portrait removal | Add optional reason | Previous screen |
| Restricted account | Global account-status gate | Exercise appeal/export/delete rights | None outside allowed rights | Appeals, Privacy/export, Delete account |
| Moderator console | Authorized You row | Review/resolve queue | Monitor signals/operations | Remains in console/back to You |
| Not found | Unknown route | Recover | None | Today |

## 6. Product entities from a UI perspective

### CURRENT IMPLEMENTATION

| Entity | Meaning and visible information | Editable/actions | Relationships |
| --- | --- | --- | --- |
| Account/session | Auth identity and account state: active, suspended, banned, deletion pending/deleted | Sign in/out, reauthenticate, request deletion | Owns one Profile and private preferences/actions |
| Profile | Username, display name, immutable birth year after creation, country, optional/hideable city, languages, optional short bio, selection opt-in, verification/assurance/account state | Create; edit all listed public fields except birth year; hide city; opt in/out | Candidate for a draw; source identity for a published Human |
| Daily draw/cycle | UTC selection date, public audit/fairness metadata, pool size/hash/seed/source, selection state | User cannot edit | Chooses one primary plus backups; links invitation, portrait, live Human, Archive entry |
| Invitation/journey | Selection date, notification/deadline, response, portrait/review/live/archive status, Human number | Accept or decline; continue portrait; answer questions | Private state for the selected account and one draw |
| Portrait | 4:5 photo and seven guided answer elements; draft/submitted/reviewed status | Selected Human uploads photo and saves answers; moderator approves/rejects | Becomes the public Human presentation when approved/live |
| Human | Carefully limited public projection: Human number, display name, country, optional city, photo, founding note, guided answers | Audience reads/shares/remembers/reports/blocks; owner can later request removal | Live for one cycle, then Archive entry; has approved Questions |
| Question | Short audience question, optional Human answer, vote total, viewer's vote state | Member asks and toggles “Ask this”; selected Human answers; moderator reviews/removes | Belongs to a draw/Human; no replies or nested comments |
| Remember | Private association between member and Human, with remembered time | Add/remove | Powers the private Remembered Humans library; never exposes a public count |
| Archive entry | Human number/date plus limited identity/photo; or number/date tombstone if removed | Browse/filter/open; former Human requests removal | Permanent sequence of completed cycles |
| Report/block | Safety action, target type/reason/note, subject/account state; private block list | Report, block, unblock; moderator resolves | Targets portrait, question, or profile |
| Moderation decision/appeal | Action, target, reason, date, appeal status/statement/resolution | Affected member appeals; moderator upholds/overturns | Connected to content/account enforcement |
| Notification preference/token | Daily, selected, answered, anniversary choices plus device push registration | Enable permission and toggle categories | Notification tap routes to cycle, invitation, Human, or Archive |
| Translation | Per-locale translated portrait responses/questions/answers | Reader toggles original/translated | Additive layer over Human content, never a replacement |

### DESIGN-AI ENTITY BOUNDARY

Only the entities above are available to the current interface. Do not invent followers, communities, impact posts, testimonies, generic reactions/comments, direct messages, feeds, or related data for generated screens.

## 7. Reusable component and pattern inventory

### CURRENT IMPLEMENTATION

| Component/pattern | Purpose and variants | Used principally in |
| --- | --- | --- |
| `Screen` | Safe-area-aware finite scroll/non-scroll frame, keyboard-aware, max content width 680 | Nearly every route |
| `Text` | Tokenized Dynamic-Type text and semantic colors; caption through hero plus mono | All UI |
| `Button` | Primary, secondary, ghost, danger; icon optional; 44pt minimum | Forms and primary actions |
| `TextField` | Label, hint/error, normal/multiline states | Auth, profiles, portrait, questions, appeals/removal |
| `Surface` | Default, raised/muted, accent, violet, warm card backgrounds | Portrait answers, journey, status and utility content |
| `PageHeader` / `SectionHeader` | Screen title/subtitle and section labels | Tabs, settings, educational and selection routes |
| `ListGroup` / `ListRow` / `SettingsSwitch` | iOS-like grouped settings rows, icon blocks, chevron/trailing controls | You and settings detail screens |
| `BrandHero` | Dark wordmark hero with cobalt/violet ambient circles, optional step | Sign-in, onboarding, invitation |
| `HumanPortrait` | Large 4:5 photo hero, Human number/name/place/timer, translation toggle, guided story cards | Today and archived Human |
| `ArchiveCard` | 86×108 thumbnail, number/name/country/date, chevron; separate tombstone | Archive and Remembered library |
| `QuestionCard` | Question, optional answer, public “Ask this” count/state, report/block | Today and Human detail |
| `RememberAction` | Signature private bookmark-style state with haptic confirmation | Today and Human detail |
| `ShareButton` / `ShareCard` | Generates an off-screen image card and opens native share sheet; text fallback | Today and Human detail |
| `JourneyCard` | Selected-person status summary; respond/write/wait/answer/archive/rejected variants | Today and You |
| `SelectionStats` / `YourStanding` | Transparent aggregate pool/representation and personal waiting position copy | How selection works, Today |
| `Sheet` | Dismissible bottom modal, max 82% height | Ask, report and contextual choices |
| `EmptyState` / `ErrorState` / `Skeleton` / `Toast` | Shared no-data, retryable error, calm pulse loading and transient confirmation | Across primary and utility screens |
| `Avatar`, `CountryBadge`, `Pill`, `Icon`, `ArticleSection` | Identity fallback, localized place, filters/status, Feather wrapper, long-form section | Archive, You, filters, education/rules |

Notable behavior: shared UI is tokenized and localized; image content uses disk caching and signed Supabase Storage URLs; motion-aware components check reduced-motion preference.

## 8. Current visual language

### CURRENT IMPLEMENTATION

The code has a coherent token system even if the rendered experience may still feel cold or unfinished.

**Color**

- Light: blue-gray canvas `#F7F8FC`, white raised surfaces, muted blue `#F0F2F8`, warm reading surface `#FBF7F3`, near-black text, cobalt action `#315CF5`, indigo depth, violet Remember state, and semantic red/green/amber surfaces.
- Dark: near-black `#0B0B0C`, layered charcoal surfaces, lightened cobalt/violet and semantic colors.
- Brand moments: dark near-black panel with cobalt and violet ambient circles and gradient wordmark.

**Typography**

- System sans-serif is used throughout; Menlo is reserved for Human numbers and timers.
- Sizes run 12 caption, 13 footnote, 16 body, 18 callout, 20/24/30 titles, 44 display, 52 hero.
- Weights 400–700, with relaxed line height intended for portrait prose.
- Text scaling is supported with capped multipliers to avoid catastrophic layout breakage.

**Layout and shape**

- 4pt spacing scale from 2 to 64; most screens use 20pt horizontal/top inset and generous 24–48pt vertical groups.
- Radii 4/8/12/20/28 and full pills. Cards use hairline borders and subtle shadows; buttons are pill-shaped.
- Main content is centered and capped at 680, while the iOS app itself is portrait-only and does not support iPad.
- Bottom tabs are 82pt high with thin Feather icons and cobalt active state.

**Motion and imagery**

- Most transitions are 100–420ms; 900ms ceremonial motion is reserved for “Selecting tomorrow's human.” Reduced motion is respected.
- Human photography is the dominant imagery, consistently cropped 4:5. Avatar fallbacks use initials; archive thumbnails are smaller 4:5 crops.
- No custom illustration system exists beyond wordmark/background orbs and app assets.

**Inputs and actions**

- Inputs are approximately 52pt high, 112pt multiline, rounded 20pt; focused/error borders use accent or danger.
- Primary actions are solid cobalt; secondary are raised white/charcoal; ghost actions are text-like; destructive actions use soft red.
- Sheets are custom React Native modals, not native iOS sheets.

**Dark mode**

- System, light, and dark choices are implemented and persisted. The splash intentionally remains white in dark mode because a light wordmark asset is missing.

## 9. States and state coverage

### CURRENT IMPLEMENTATION

Core remote-data routes generally expose loading skeletons, empty states, retryable errors, and populated content. Strongly handled states include Today Quiet Day/removed/malformed, Archive filtered-empty/tombstone/end, selection invitation stages, selected-person journey stages, moderation unauthorized/empty queues, and deletion progress/failure/manual review.

### MISSING OR WEAK DESIGN STATES

The future design system should explicitly define these without changing backend semantics:

- First-use context for Archive and Remember before meaningful content exists.
- Consistent offline treatment per screen: cached/stale public data versus private data unavailable.
- No-search-results is not applicable today because search is not implemented; if search is later approved, it requires a real product/backend decision.
- Consistent inline success state after profile save, rules acceptance, unblocking, appeal submission, and Archive-removal submission; some current flows only navigate back or mutate the row.
- Explicit loading/disabled presentation while notification/privacy settings are fetched or saved.
- Field-level autosave failure/retry and conflict state for each portrait answer.
- Sheet focus management, VoiceOver announcement, and keyboard escape/dismissal behavior.
- Permission states for photo library and notifications: not determined, denied, limited, permanently denied/settings redirect, and granted.
- Expired invitation and cycle rollover while a form is open.
- Translation partially available (some answers/questions translated, others original only).
- Image unavailable/corrupt/upload failed/delete pending while the rest of the Human remains readable.
- Restricted/suspended/banned states are implemented globally; designs should cover each status copy and the deletion-pending variant.
- Destructive confirmation, reauthentication, in-progress, retryable failure, manual review, and completed deletion must remain distinct.

## 10. UX and UI inconsistencies

### CURRENT IMPLEMENTATION — OBSERVED PROBLEMS

| Current behavior | Problem category and consequence |
| --- | --- |
| The central portrait is split into a hero plus up to seven similarly shaped answer cards | **Visual hierarchy:** long-form humanity can feel like a stack of modules rather than one authored story |
| “You” combines identity, journey, language choices, preferences, safety, legal links, account actions, and dev diagnostics | **Information architecture:** a personal destination behaves mainly as a settings directory and has weak expressive identity |
| Archive combines Yesterday, Remembered, anniversaries, random discovery, country/year filters, and recent pages | **IA:** many discovery modes compete in one long screen |
| Archive cards display raw `YYYY-MM-DD` strings while other copy is localized | **Consistency:** date presentation does not match a polished international editorial product |
| Most pushed screens suppress native headers and draw an in-content `PageHeader` | **Navigation:** back affordance and title behavior rely on screen implementation rather than one uniform native pattern |
| Sign-in copy expects a six-digit code while the verify input accepts 6–10 digits; deletion reauthentication expects exactly six | **Content consistency:** hosted OTP configuration and guidance can diverge |
| Country onboarding copy says it is used for geographic balance, while the constitution says country balance must never influence the draw | **Product contradiction:** fairness explanation can imply forbidden weighting |
| Some mutations confirm by toast, some by navigation, and some only by changed row state | **Feedback consistency:** success and failure are not communicated with a single predictable hierarchy |
| Core query routes have skeletons, but several preference screens initially resemble default/off values | **State clarity:** loading can be mistaken for a saved preference |
| Custom sheets visually mimic native sheets but show no explicit focus trap/initial VoiceOver focus handling | **Accessibility:** modal semantics may be weaker than their visual treatment suggests |
| Feather icons are cross-platform rather than SF Symbols | **iOS fidelity:** functional and coherent, but less native-feeling on iOS |
| The splash remains white in dark mode | **Theme consistency:** launch transition can flash against a dark preference |
| Only Remember currently triggers a distinctive haptic | **Interaction consistency:** other consequential iOS actions lack a defined haptic policy |
| Public query results persist offline for 24 hours, while private results do not | **Offline mental model:** a global banner alone cannot explain which content is stale, cached, or unavailable |
| Documentation calls translated user content deferred, while current code implements translations | **Documentation consistency:** intended scope and shipped behavior disagree |

## 11. iOS-first constraints

### CURRENT IMPLEMENTATION

- Expo SDK 57, React Native 0.86, Expo Router, portrait orientation, iPhone-only (`supportsTablet: false`).
- Product name **Unumae** and iOS bundle identifier **`com.unumae.app`**.
- Sign in with Apple, App Attest/DeviceCheck integration path, Apple associated domains, universal links, push notifications, photo-library picker, native sharing, safe-area support, interactive keyboard dismissal, and automatic light/dark appearance.
- DeviceCheck server credentials are configured per project documentation; signed physical-device verification is intentionally deferred to a later release phase.
- Android-compatible configuration remains in the repository but Android launch work is explicitly deferred.

### CONSTRAINTS FOR FUTURE VISUAL WORK

- Design for iPhone safe areas, Dynamic Island/notches, home indicator, interactive back gesture, keyboard avoidance, and one-handed 44pt+ controls.
- Preserve native bottom-tab expectations and route continuity. Custom navigation must still map cleanly to Expo Router stacks/tabs.
- Use native-feeling sheets/contextual actions and consider SF Symbols or a coherent equivalent while remaining implementable in Expo.
- Support Dynamic Type, VoiceOver order/labels, reduced motion, sufficient contrast, large content sizes, and translated EN/FR/DE strings that can expand.
- Provide both light and dark designs. Human photographs must not depend on color treatment for meaning.
- Do not introduce Android-specific patterns or require Android validation for the initial redesign.

## 12. Technical constraints

### CURRENT IMPLEMENTATION

- **Backend:** one hosted Supabase project for Auth, Postgres/RPCs, RLS, private Storage, cron/Vault, and Edge Functions. UI data is remote and subject to latency, RLS, moderation, signed-URL expiry, and account state.
- **State/data:** TanStack Query for server state and mutations; a small Zustand preference store for locale/appearance; React Hook Form and Zod for form validation.
- **Offline:** selected public queries (Today, Archive, Human, anniversaries and filter metadata) persist for up to 24 hours. There is no general offline mutation queue; private query data is deliberately not persisted.
- **Updates:** no user-facing real-time subscription layer was found. Data refreshes through queries, mutations, lifecycle invalidation, timers, and notification routing.
- **Images:** photo-library access only; chosen photos are cropped/downscaled to 4:5 JPEG, size-checked, uploaded to a private bucket, and viewed through temporary signed URLs. No camera capture is implemented.
- **Notifications:** Expo Push categories are daily, selected, answered, anniversary. Push and Apple authentication require an appropriate native build and are unavailable or limited in Expo Go/web.
- **Deep links:** `onehuman://`; associated web domains support `/human/[id]`, and `/today` redirects to the Today tab. Notification actions also deep-route.
- **Localization:** all production UI strings should come from parity-checked EN/FR/DE resources. User content translation is additive.
- **Permissions/privacy:** photo library and notifications only in current mobile flows; country/city are typed, not read from Location Services. No contacts, advertising identifier, tracking SDK, microphone, or biometric/liveness collection.
- **Account safety:** global gates must remain authoritative for incomplete, suspended, banned, and deletion-pending accounts. Destructive account deletion is asynchronous and may require recent reauthentication.
- **Pagination:** finite explicit “Load earlier”; never infinite loading or an autoplay chain.

## 13. Design principles for a future redesign

### DESIGN RECOMMENDATION

1. **Make one person unmistakably central.** Photography, voice, and story precede controls and system status.
2. **Warmth without sentimentality.** Use material warmth, confident typography, and restrained color—not moralizing illustrations or forced uplift.
3. **Editorial continuity over card fragmentation.** Long-form answers should read as one considered portrait even when components remain reusable.
4. **Trust is visible but quiet.** Explain consent, fairness, moderation, privacy, translation, and UTC timing at the moment they matter.
5. **Private meaning over public performance.** Remember is personal; avoid public accumulation, badges, streaks, scores, moral rankings, or vanity metrics.
6. **Finite by design.** Today has a meaningful end; Archive pagination is intentional; no visual affordance should imply an endless algorithmic feed.
7. **Native iOS ease.** Respect platform navigation, sheets, touch targets, typography scaling, haptics, keyboard behavior, and accessibility.
8. **International from the canvas outward.** Design for longer French/German copy, flags/country names, translated/original states, and one shared UTC moment.
9. **Calm statefulness.** Loading, offline, moderation, permission, rollover, and failure states should feel deliberate rather than like unfinished screens.
10. **Premium, not corporate.** Avoid dashboard grids, fintech gradients, productivity density, sterile monochrome, and generic SaaS settings styling.
11. **Emotion without gamification.** Let the Human's own words and story create meaning; numbers should provide necessary context rather than status.
12. **Safety without a hostile atmosphere.** Reporting, blocking, removal, appeals, and restriction remain easy to find without dominating ordinary reading.

## 14. Things that must remain supported

### CURRENT IMPLEMENTATION / PRODUCT INTENT

- Guest access to Today, questions/answers, Archive, Human detail, and sharing.
- Exactly one principal Human per global UTC cycle, with an honest Quiet Day when necessary.
- Explicit acceptance and guided portrait creation before manual moderation/publication.
- A finite Today experience and explicit Archive pagination—no infinite algorithmic feed.
- Seven guided story prompts, 4:5 image, optional city, protected surname/exact age, original and translated text.
- Questions rather than comment threads; upvote-only “Ask this”; optional answers from Today's Human.
- Private Remember library with no public count.
- Chronological Archive and privacy-preserving removed-Human tombstones.
- Fair selection transparency, equal chance among eligible users, no paid/fame/country weighting, no repeat selection.
- Sign in with Apple and email OTP, but no sign-up wall for reading.
- Report, block, moderation, appeal, Archive removal, export, restricted-account, and asynchronous deletion flows.
- EN/FR/DE, light/dark/system appearance, safe areas, Dynamic Type, VoiceOver, contrast, reduced motion, and 44pt targets.
- Notification/deep-link destinations, native sharing, photo permission/upload/delete behavior, offline public cache, and slow-network states.
- iOS-first launch, Expo/React Native feasibility, one Supabase project, and `com.unumae.app`.

## 15. Things that must be avoided

### PRODUCT INTENT

- Followers/following, social graph, DMs, groups, public popularity counts, leaderboards, rankings, streaks, badges, trending/top-Human ordering, reels/stories, autoplay, infinite feed, or paid visibility/chance.
- Corporate, fintech, crypto, productivity-SaaS, sterile, childish, excessively colorful, or visually empty aesthetics.
- Presenting a Human as a post, creator, candidate score, or engagement object.
- Replacing original words with translation, exposing precise/private identity, or implying attestation proves global uniqueness.
- Suggesting that country, language, payment, fame, activity volume, beauty, or content quality changes selection probability.
- Publishing unmoderated content or exposing private moderation/removal reasons.
- Inventing followers, communities, impact posts, testimonies, generic comments, direct messages, feeds, or other unsupported social-network UI.
- Letting Android requirements constrain the current iOS redesign.

## 16. Ambiguities and contradictions requiring product attention

1. Onboarding country helper copy suggests geographic balance affects selection; the constitution forbids nationality quotas and any country input to the draw.
2. The constitution lists translated user content as deferred, but translation is implemented and exposed.
3. The constitution names optional audio/video as a portrait element, while the current MVP and UI do not implement capture or playback.
4. Documentation says the current UI redesign addressed cold/empty presentation, but the stated stakeholder perception remains cold, colorless, empty, and unfinished. Visual validation should use current real-device captures rather than assuming the code-level audit settled perception.
5. Email OTP copy and accepted input length are not fully aligned; design copy should follow the actual hosted Auth code length once fixed as a product invariant.
