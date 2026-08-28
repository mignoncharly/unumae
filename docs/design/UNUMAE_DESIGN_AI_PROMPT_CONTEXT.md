# Unumae design-AI prompt context

Use this as product and implementation context for a **visual/interaction redesign of existing functionality**. Do not invent features, change the data model, or turn the app into a conventional engagement network. Statements marked CURRENT IMPLEMENTATION are facts; PRODUCT INTENT is repository policy; DESIGN RECOMMENDATION is design guidance.

## 1. What Unumae is

### CURRENT IMPLEMENTATION

Unumae is “8 billion people. One today.” Every 24-hour UTC cycle, one eligible ordinary member is randomly selected. After consent, a guided portrait, and manual moderation, that person becomes Today's Human. Anyone can read their story and approved Q&A. Members may ask, vote “Ask this,” privately Remember, report/block, and opt into selection. Past Humans form a permanent chronological Archive with privacy-preserving tombstones.

### PRODUCT INTENT

The repository and `PRODUCT_CONSTITUTION.md` are authoritative. The defining sequence is **selection → consent → guided portrait → moderation → Today's Human → moderated Q&A → Archive**. Preserve the finite daily encounter; do not expand it into a conventional social network.

## 2. Who it is for

- Guest readers anywhere in the world who want one finite, human story rather than a feed.
- Members who want to participate quietly, ask thoughtful questions, privately remember stories, and have an equal chance to be selected.
- The selected Human, who needs a calm consent, authorship, review, live-Q&A and Archive journey.
- Moderators/operators who keep all public content reviewed and the daily system safe.

## 3. Core philosophy

### PRODUCT INTENT

- The person is the star; the interface is furniture.
- One ordinary person, one shared global day, equal chance among eligible members.
- Guest reading is permanent; high assurance appears only where risk warrants it.
- Human content before viral content; discovery before infinite consumption.
- Private meaning over public status: Remember has no public count.
- Manual moderation before publication; privacy and right-to-leave take priority.
- International and accessible from the beginning.
- No followers, rankings, paid visibility/chance, influencer priority, social graph, DMs, groups, infinite feed, streaks or gamified morality.

## 4. Existing features

### CURRENT IMPLEMENTATION

- Live Today portrait: 4:5 photo, Human number, first/display name, country, optional city, founding note, UTC countdown, seven guided answers.
- Approved questions/optional answers, short question submission, upvote-only “Ask this.”
- Additive EN/FR/DE machine translation with original always available.
- Private Remember library, native image-card/text share, report and block.
- Archive: Yesterday, anniversaries, Random Human, country/year filters, explicit recent pagination, removed-Human tombstones.
- Apple and email-OTP authentication; guest continuation; three-step onboarding/profile.
- Selection eligibility/attestation, invitation acceptance/decline, portrait photo/answer authoring, manual-review status, selected-Human question answering.
- Profile, language, appearance, notifications, privacy/city hiding, export, blocked users, appeals, Archive removal, account deletion/restriction.
- Public fairness/selection explanation and statistics; internal moderation/operations console.
- Search, subscriptions/paywall, camera capture, precise location, audio/video portraits, and Android launch verification are not implemented. Do not invent unsupported social-network features.

## 5. Navigation

### CURRENT IMPLEMENTATION

```text
Root Expo Router stack
├── Bottom tabs: Today / Archive / You
├── Auth modal: Sign in / Verify
├── Non-dismissible onboarding modal: Idea / Philosophy / Profile form
├── Selection stack: Invitation / Portrait / Answer questions / Status
├── Human detail and Remembered library
├── Settings, privacy/safety, education and account routes
├── Restricted-account gate
└── Moderator console
```

Global gates route incomplete profiles to onboarding, restricted accounts to Restricted Account, and newly selected members to the relevant journey action. Notifications/deep links lead to Today, Invitation, Human detail, or Archive. Guests may browse without signing in.

## 6. Important screens

- **Today:** primary emotional experience and single live Human.
- **Archive / Human detail:** bounded discovery and long-term memory.
- **Sign in / Onboarding:** value proposition and transition from guest to participant.
- **Invitation / Portrait / Status / Answer questions:** complete selected-Human journey.
- **You / Profile / Eligibility:** identity and participation hub.
- **Notifications / Privacy / Rules / Restricted:** essential trust and support surfaces.

There are 27 production visual routes, four dev-only routes, and a nonvisual `/today` redirect. Onboarding adds three separately designable canvases inside one route.

## 7. Entities and data

### CURRENT IMPLEMENTATION

- **Profile:** username, display name, birth year, country, optional/hideable city, languages, optional bio, participation, assurance/account states.
- **Daily draw:** UTC date, immutable fairness/audit data, candidate count, state; private selected identity until publication.
- **Invitation/journey:** response deadline, acceptance, portrait/review/live/archive stage.
- **Portrait/Human:** private draft photo and seven guided answers; after approval, a limited public Human projection.
- **Question:** body, optional Human answer, public vote total and viewer vote state; no replies.
- **Remember:** private member–Human association; no public count.
- **Archive entry:** Human/date identity projection or anonymous tombstone.
- **Report/block, moderation decision, appeal, removal request:** safety and rights workflow data.
- **Notification preference/token and translation:** device choices and additive content language.

Only these entities are available to the current interface. Do not invent followers, communities, impact posts, testimonies, generic reactions/comments, direct messages, feeds, or related data.

## 8. Major flows

### CURRENT IMPLEMENTATION

1. Launch/deep link → session/gates → requested public or protected route.
2. Guest → Today → story/Q&A → Share or Archive; protected action → Sign in.
3. Apple/email auth → optional OTP → idea → philosophy → profile → Today.
4. Returning member → Today/Journey card → ask/vote/Remember/share/report → Human detail → back.
5. Archive → Yesterday/anniversary/random/filter/recent/Remembered → Human detail.
6. Selected → 12-hour accept/decline → photo + ≥5 of 7 answers → review → live → answer questions → Archive.
7. You → profile/eligibility/preferences/privacy/export/appeal/removal/deletion/restriction.
8. Moderator → queue/operations tab → logged decision → refreshed state.

These are the complete implemented flow families. Do not add conventional social-network journeys such as following, communities, feeds, direct messaging, generic commenting, impact posts, testimonies, or a generic public-member-profile flow.

## 9. Visual direction

### CURRENT IMPLEMENTATION

Light mode uses blue-gray `#F7F8FC`, white/warm surfaces and cobalt `#315CF5`; dark mode uses near-black/charcoal and lighter cobalt/violet. Typography is system sans (12–52pt) plus Menlo for numbers/timers. Layout uses a 4pt spacing scale, 20/28pt card radii, pill buttons, subtle shadows, Feather icons, 4:5 portrait photography, and dark wordmark heroes. System/light/dark, Dynamic Type and reduced motion are implemented.

### DESIGN RECOMMENDATION

Make the app warmer, emotionally engaging and more authored while staying minimal. Aim for premium editorial/documentary iOS—not corporate, fintech, crypto, SaaS, sterile monochrome, childish color, or gamified social media. Reduce the sense that one portrait is a stack of interchangeable cards. Strengthen identity/story hierarchy, calm state communication, native navigation and coherent success/permission/offline feedback.

## 10. iOS-first constraints

- Expo SDK 57 / React Native 0.86 / Expo Router; iPhone portrait only, no iPad.
- Product **Unumae**, bundle id **`com.unumae.app`**.
- Respect safe areas, home indicator, swipe-back, keyboard-aware forms, native bottom tabs/sheets, 44pt targets, VoiceOver, Dynamic Type, reduced motion, contrast and light/dark mode.
- Sign in with Apple, App Attest/DeviceCheck path, Expo Push, universal links, photo-library access and native sharing must remain feasible.
- EN/FR/DE copy expands; the UTC cycle is globally identical.
- Android is deferred and must not constrain the initial redesign, though feasible React Native patterns are preferred.

## 11. Things that MUST remain supported

- Guest-readable Today, Archive, Human detail and sharing.
- One Human per global UTC day, live countdown, Quiet Day and finite ending.
- Consent → guided portrait → human moderation → live Q&A → Archive.
- 4:5 photo, seven prompts, original/translated mode, optional city/privacy.
- Questions without threads; upvote-only “Ask this”; private Remember without count.
- Chronological/filterable Archive, explicit Load earlier, Random/Yesterday/anniversaries, tombstones.
- Equal/no-repeat/unpaid selection and transparent eligibility.
- Apple/email auth, profile/onboarding, notifications/deep links, photo upload/delete, offline cached public reading.
- Report/block/appeal/removal/export/restriction/deletion states.
- Accessibility, slow-network/loading/error/empty/permission/rollover states.

## 12. Things that MUST be avoided

- Followers, DMs, groups, social graph, leaderboards, badges, moral scores, public Remember totals, popularity order, trending, infinite feed, autoplay or paid selection/visibility.
- Treating a Human as a post/creator, or making the interface/metrics compete with their story.
- Replacing original words with translation; exposing private identity or moderation reasons.
- Suggesting country, language, fame, payment, beauty, content quality or activity volume affects draw probability.
- Inventing followers, communities, impact posts, testimonies, generic comments, direct messages, feeds, or other unsupported social-network screens or backend behavior.
- Android-specific requirements in this iOS-first work.

# Screens to Redesign

The following are all P0/P1 production routes. P2 legal/account/operations screens still need coherent system styling but are not the first emotional-design batch.

## Today

**Purpose:** Meet the one live Human and experience their story for this UTC day.

**Primary user action:** Read the guided portrait.

**Secondary actions:** Translate, ask, “Ask this,” Remember, share, report/block, follow selected journey, open Archive on Quiet Day.

**Required information:** Human number/photo/name/place/founding note/countdown; seven answers; questions/answers/votes; private Remember and journey state.

**Required UI elements:** Live hero, timer, story presentation, translation control, Q&A, Ask sheet, Remember, share, quiet/end markers.

**States to design:** Skeleton, retry error, Quiet Day, removed/malformed Human, guest/member, original/translated/partial translation, empty questions, action busy/success/error, cached offline.

**Comes from:** Launch, Today tab, `/today`, daily notification, back navigation.

**Leads to:** Auth, Archive, selection routes, modal sheets/native share.

**Important UX constraints:** One person only; finite ending; no signup wall, recommendation feed, public Remember count or popularity framing.

## Archive

**Purpose:** Discover past Humans through bounded, non-popularity paths.

**Primary user action:** Open one archived Human.

**Secondary actions:** Yesterday, anniversary, random, country/year filter, Remembered library, Load earlier.

**Required information:** Human number/date/name/country/photo or tombstone; available filters and pagination state.

**Required UI elements:** Discovery modules, Archive cards, filter pills, explicit pagination, empty/error/skeleton.

**States to design:** Loading, partial loading, error, archive empty, filtered empty, removed, pagination busy/end, guest/member, offline cached.

**Comes from:** Archive tab, Quiet Day, notifications.

**Leads to:** Human detail, Remembered Humans.

**Important UX constraints:** Chronological/no popularity sort; no infinite scroll; removed entries preserve only number/date.

## Sign in

**Purpose:** Authenticate for member actions without weakening guest access.

**Primary user action:** Sign in with Apple or email.

**Secondary actions:** Continue as guest, dismiss.

**Required information:** Value proposition, Apple availability, email guidance/errors.

**Required UI elements:** Brand hero, native Apple button, email field/CTA, guest action.

**States to design:** Apple supported/unsupported/Expo Go, default, invalid email, submitting, canceled, network/provider error.

**Comes from:** Protected action or You guest CTA.

**Leads to:** Verify, Onboarding, previous public screen.

**Important UX constraints:** Guest remains a valid choice; use Apple's required native treatment; no manipulative signup framing.

## Profile onboarding

**Purpose:** Explain Unumae and create the minimum member profile.

**Primary user action:** Complete three steps and save profile.

**Secondary actions:** Back between steps, opt in/out, open deletion.

**Required information:** Idea, philosophy; username, name, birth year, country, languages, optional city/bio, explicit participation choice.

**Required UI elements:** Two narrative heroes, step/progress model, form/pickers, privacy and validation copy.

**States to design:** Each of three canvases; blank/partial/valid; under-16, username conflict/field errors; saving/server error/success.

**Comes from:** First successful auth via global gate.

**Leads to:** Today or Delete account.

**Important UX constraints:** Non-dismissible once profileless and signed in; birth year immutable; selection consent must be neutral and explicit; country must not imply weighted selection.

## Selection invitation

**Purpose:** Let a selected member accept or decline calmly within 12 hours.

**Primary user action:** Accept or decline.

**Secondary actions:** Read consequences/reassurance.

**Required information:** Selection date, exact remaining time, publication process, no-penalty promise.

**Required UI elements:** Ceremonial hero, countdown, explanation, accept/decline actions.

**States to design:** Loading, no invitation, active, urgent, expired, action busy/error.

**Comes from:** Selected push, Journey gate/card/status.

**Leads to:** Portrait or Today.

**Important UX constraints:** No pressure/slot-machine imagery; decline is legitimate; countdown announcements must be accessible.

## Build your portrait

**Purpose:** Author an authentic portrait for moderation.

**Primary user action:** Add photo and at least five guided answers, then submit.

**Secondary actions:** Replace photo, skip optional prompts, resume later.

**Required information:** Seven prompts/answers and revisions, photo, completion and deadline/review guidance.

**Required UI elements:** 4:5 picker/preview, seven multiline inputs, per-field save state, progress, submit.

**States to design:** Loading/not selected; blank/partial/ready; photo permission variants; image processing/upload failure; autosaving/saved/conflict/error; disabled/submitting/success/rejected/expired.

**Comes from:** Accepted invitation, Journey card/status.

**Leads to:** Selection status.

**Important UX constraints:** Prompts elicit but never compose personality; photo library only; recover drafts; manual review before public visibility.

## Answer questions

**Purpose:** Let Today's Human choose and publish answers during the live day.

**Primary user action:** Answer or update an approved question.

**Secondary actions:** Skip any question; return to status.

**Required information:** Questions, vote totals, existing answers, live-cycle context.

**Required UI elements:** Question/answer cards, multiline fields, counts, per-item save action/state, toast.

**States to design:** Loading, not live, no questions, unanswered/answered/editing, disabled, saving/success/error, UTC rollover.

**Comes from:** Journey card/status/answered context.

**Leads to:** Status/previous route.

**Important UX constraints:** Answering is optional; vote total is question priority, not judgement of the Human; no reply threads.

## Selection status

**Purpose:** Make the selected person's current stage and next action unambiguous.

**Primary user action:** Continue the available stage action.

**Secondary actions:** Read waiting/rejection/archive guidance.

**Required information:** Date and one of respond, write, review wait, live wait, answer, archived, rejected.

**Required UI elements:** Status/stage presentation, contextual CTA, promise/reassurance.

**States to design:** Loading, no journey, seven stage variants, query error, rollover/stale transition.

**Comes from:** Journey card, Portrait submission, selection routes.

**Leads to:** Invitation, Portrait, Questions, Today/Archive.

**Important UX constraints:** Do not imply action while waiting; remain consistent with the educational five-step journey.

## Archived Human detail

**Purpose:** Read a past Human's complete public portrait.

**Primary user action:** Read the story and Q&A.

**Secondary actions:** Translate, Remember, share, report/block, back.

**Required information:** Human projection, seven answers, approved Q&A, Remember state.

**Required UI elements:** Archived portrait, story, translation, Q&A, actions, back context.

**States to design:** Loading, retry error, not found, removed tombstone, populated, guest/member, missing image/partial translation/offline cached.

**Comes from:** Archive, Remembered, random/anniversary/deep link/notification.

**Leads to:** Prior context or Auth for protected action.

**Important UX constraints:** No live timer or voting; this is a Human, not a generic profile/post; retain finite reading.

## You

**Purpose:** Show member identity/journey and provide organized access to settings and rights.

**Primary user action:** Understand account/journey state or choose a destination.

**Secondary actions:** Edit, change language/preferences, view rules/education/legal, sign out/delete.

**Required information:** Guest/incomplete/member identity, profile summary, journey, founding/moderator status.

**Required UI elements:** Personal header/surface, Journey card, grouped navigation and language choice.

**States to design:** Guest, incomplete profile, full member, journey/no journey, moderator, signing out/error.

**Comes from:** You tab.

**Leads to:** Auth, Onboarding, all settings/education/Admin/external legal pages.

**Important UX constraints:** It is a private account/journey hub, not a general public profile; do not invent follower metrics, feeds, or unsupported public activity.

## Verify email code

**Purpose:** Complete email authentication.

**Primary user action:** Enter and verify OTP.

**Secondary actions:** Resend, back.

**Required information:** Email destination and code guidance.

**Required UI elements:** Numeric code input, verify/resend, inline error.

**States to design:** Incomplete/disabled, verifying, invalid/expired/network error, resend busy/sent, success.

**Comes from:** Email Sign in.

**Leads to:** Onboarding or returned app route.

**Important UX constraints:** Current client accepts 6–10 digits; copy must match hosted Auth behavior.

## Remembered Humans

**Purpose:** Revisit the member's private emotional library.

**Primary user action:** Open a Remembered Human.

**Secondary actions:** Load earlier, return to Archive.

**Required information:** Remembered-time-ordered Human cards.

**Required UI elements:** Header, Archive cards, empty/error/skeleton, pagination.

**States to design:** Loading, error, first-use empty, populated, pagination end, signed-out/private-data offline.

**Comes from:** Archive.

**Leads to:** Human detail, Archive.

**Important UX constraints:** Private, no count/status competition; explain meaning without gamification.

## Edit profile

**Purpose:** Maintain the minimal identity used by the product.

**Primary user action:** Save profile changes.

**Secondary actions:** Change country/languages/city/bio, cancel/back.

**Required information:** Name, username, country, city, bio, languages; birth year is immutable and absent.

**Required UI elements:** Header, fields/pickers, validation, save.

**States to design:** Loading, populated/dirty, validation/username conflict, saving, server error, success.

**Comes from:** You.

**Leads to:** You.

**Important UX constraints:** Do not add public engagement metrics, badges, or imply that a general public-member-profile route exists.

## Eligibility and draw

**Purpose:** Explain binary draw eligibility and let the user manage participation/assurance.

**Primary user action:** Resolve an eligible gate or toggle participation.

**Secondary actions:** Request attestation review, read If you are chosen.

**Required information:** Status, every unmet reason, attestation/review state and selection choice.

**Required UI elements:** Semantic status, reason list, attestation actions, switch, education link.

**States to design:** Loading; eligible; temporary/permanent ineligible; provider/device/review variants; save/action error.

**Comes from:** You/profile onboarding.

**Leads to:** If you are chosen; system attestation flow.

**Important UX constraints:** Equal chance is binary; never show scores/tiers or overclaim unique-human proof.

## Notification preferences

**Purpose:** Enable useful push and select categories.

**Primary user action:** Enable notifications or toggle one category.

**Secondary actions:** Recover from denied/unavailable state.

**Required information:** Daily, selected, answered and anniversary examples; permission/token state.

**Required UI elements:** Enable/status panel, grouped switches, toast/error.

**States to design:** Loading, unavailable/Expo Go, undetermined, denied, granted/unregistered, enabled, saving/error/success.

**Comes from:** You.

**Leads to:** Native settings indirectly; future notification routes.

**Important UX constraints:** No engagement-bait categories; switches must not look false while merely loading.

## Privacy and your data

**Purpose:** Control city exposure, export data, and access rights/safety tools.

**Primary user action:** Change city visibility or export.

**Secondary actions:** Open blocks, appeals, Archive removal.

**Required information:** Country/public-city policy and collected/never-collected data.

**Required UI elements:** Privacy switch/rows, export, disclosure surfaces, feedback.

**States to design:** Loading/missing profile; city absent/present/hidden; saving/error; exporting/success/error; offline.

**Comes from:** You.

**Leads to:** Blocked, Appeals, Archive removal, native share sheet.

**Important UX constraints:** Typed city/country—not device location; no tracking, contacts or ad data.

## Community rules

**Purpose:** Let a member understand and accept participation rules.

**Primary user action:** Read and accept.

**Secondary actions:** Back.

**Required information:** Eight numbered rule sections and acceptance state.

**Required UI elements:** Article layout, persistent/proximate acceptance control, error/state confirmation.

**States to design:** Incomplete/unauthenticated, not accepted, accepting, accepted, error.

**Comes from:** You/Eligibility.

**Leads to:** Previous route/Eligibility.

**Important UX constraints:** Acceptance is required for selection, not public reading; no dark pattern.

## How selection works

**Purpose:** Make fairness publicly understandable and inspectable.

**Primary user action:** Read selection explanation.

**Secondary actions:** Inspect live aggregate statistics.

**Required information:** Eligibility, frozen pool/random draw/backups, once-only rule, verification/safety, forbidden inputs, representation.

**Required UI elements:** Editorial sections plus live-stat displays.

**States to design:** Static content; stats loading/error/available/privacy-threshold state.

**Comes from:** You/Eligibility/public context.

**Leads to:** Previous route.

**Important UX constraints:** Country balance is measured only and never influences the draw; do not turn transparency into a dashboard spectacle.

## If you are chosen

**Purpose:** Explain the selected-person lifecycle before it happens.

**Primary user action:** Read the five-step process.

**Secondary actions:** Back.

**Required information:** Accept, write, review, live, after/archive plus rights/reassurance.

**Required UI elements:** Page introduction and clear sequence.

**States to design:** Static.

**Comes from:** You, Eligibility, selection context.

**Leads to:** Previous route.

**Important UX constraints:** Match actual Journey states; consent, no-penalty decline and right not to answer must be explicit.

## Restricted account

**Purpose:** Safely constrain a suspended, banned or deletion-pending account while preserving rights.

**Primary user action:** Appeal, export, or continue deletion as allowed.

**Secondary actions:** None outside the bounded rights.

**Required information:** Exact account state and available rights.

**Required UI elements:** Full-screen status, calm explanation, limited actions.

**States to design:** Suspended, banned, deletion pending, loading/fallback.

**Comes from:** Global account-status gate.

**Leads to:** Appeals, Privacy export, Delete account.

**Important UX constraints:** Prevent escape to normal use; distinguish punitive restriction from user-requested deletion; never expose internal moderation details.
