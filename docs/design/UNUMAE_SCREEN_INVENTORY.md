# Unumae screen inventory

**Counting rule:** the repository contains **27 production visual route screens**, one nonvisual `/today` redirect, and four development-only visual routes. The onboarding route contains three sequential canvases, so a design tool may treat the production experience as **29 design canvases**. The moderator console is one route with eight internal tabs.

Everything in the route catalog below is **CURRENT IMPLEMENTATION**. “Problems” are observed audit findings, not proposed redesigns; this file does not invent future functionality.

Priorities mean: **P0** core launch/emotional or selected-Human experience; **P1** important supporting experience; **P2** secondary, legal, safety, operational, or developer utility. P2 does not mean optional to implement or legally unimportant.

## Production screens

### 1. Today — P0

- **Route:** `/` (`src/app/(tabs)/index.tsx`)
- **Purpose / user goal:** Meet the single live Human, understand their story, and take a restrained meaningful action.
- **Information:** daily tagline; selected-user journey; Human number, photo, name, country/city, founding note, global countdown; guided responses; translation mode; approved questions, answers and vote totals; personal selection standing.
- **UI elements:** bottom tab, portrait hero, timer, warm/default story surfaces, translation toggle, section headers, Question cards, Ask sheet, Remember action, Share button, report/block sheet, standing panel, end marker, toast.
- **Actions:** read; show translation/original; ask; toggle “Ask this”; Remember/forget; share; report; block; open sign-in; open Archive from Quiet Day; follow journey CTA.
- **Leads to:** Sign in, Invitation/Portrait/Status/Questions, Archive; sheets do not create routes.
- **Data:** current Human, portrait elements/photo signed URL, questions, translations, Remember state, session/profile, journey, standing.
- **States:** loading skeleton; request error/retry; Quiet Day; removed Human; malformed payload; guest/authenticated; original/translated; no questions; action busy/success/failure; offline cached/stale.
- **Problems:** **UX:** very long scroll and many controls after the story. **Hierarchy:** seven similar answer cards fragment editorial reading. **Consistency:** offline staleness is only globally signaled.

### 2. Archive — P0

- **Route:** `/archive` (`src/app/(tabs)/archive.tsx`)
- **Purpose / user goal:** Discover past Humans through chronological and bounded exploratory paths.
- **Information:** Yesterday, private Remembered preview, anniversaries, Random Human, available country/year filters, recent Humans, removed tombstones.
- **UI elements:** page/section headers, Archive cards, horizontal pills, discovery surfaces, explicit Load earlier, skeletons, empty/error states.
- **Actions:** open a Human; open Remembered library; draw another random Human; choose/clear country and year; load earlier; retry.
- **Leads to:** Human detail, Remembered Humans.
- **Data:** yesterday, anniversaries, random Human, archive page/cursor, country/year metadata, session.
- **States:** loading; partial section loading; error/retry; wholly empty; filtered empty; populated; removed entries; pagination busy/end; guest/member; offline cached.
- **Problems:** **IA:** six discovery concepts compete on one long page. **Visual hierarchy:** comparable cards/surfaces do not clearly establish the main archive task. **Consistency:** raw ISO dates are displayed.

### 3. You — P1

- **Route:** `/settings` (`src/app/(tabs)/settings.tsx`)
- **Purpose / user goal:** See account identity/journey and reach preferences, safety, product information and account controls.
- **Information:** profile summary or guest/incomplete prompt; Founding status; journey history; language; grouped account/experience/privacy/about options; moderator status; project/dev details in development.
- **UI elements:** page header, Avatar profile surface, Journey card, native-style grouped rows, inline language radio choices, sign-out/delete actions, toast.
- **Actions:** sign in; complete/edit profile; open journey/eligibility/notifications/appearance/privacy/safety/rules/education/legal/admin; switch language; sign out; delete account.
- **Leads to:** nearly every settings/educational route, Auth, Onboarding, Admin, external About/Terms/Privacy.
- **Data:** session, profile, Human journey, moderator flag, preferences, founding status.
- **States:** guest; signed-in/profile complete; signed-in/profile incomplete; journey/no journey; moderator/member; signing out/error.
- **Problems:** **IA:** personal identity, journey, settings, legal and development tools share one destination. **Hierarchy:** “You” is mostly a settings directory rather than an expressive identity. **Consistency:** language control is inline while other preferences open detail screens.

### 4. Sign in — P0

- **Route:** `/(auth)/sign-in`
- **Purpose / user goal:** Authenticate only when member capabilities are wanted, or continue browsing as guest.
- **Information:** product value proposition, Apple availability explanation, email guidance and privacy posture.
- **UI elements:** Brand hero, native Apple button where supported, email field, primary continue button, guest button, inline error.
- **Actions:** Sign in with Apple; submit email; continue as guest; dismiss modal.
- **Leads to:** Verify code, previous screen, or session-triggered Onboarding.
- **Data:** authentication provider availability, entered email, auth response.
- **States:** default; Apple supported/unsupported/Expo Go; invalid email; submitting; provider canceled; provider/network error.
- **Problems:** **Consistency:** Apple is visually native while email uses custom form controls. **Content:** hosted OTP length expectation is not fully aligned across screens.

### 5. Verify email code — P1

- **Route:** `/(auth)/verify`
- **Purpose / user goal:** Complete email one-time-code authentication.
- **Information:** destination email and verification instructions.
- **UI elements:** title/copy, numeric code field, verify button, resend affordance, error text.
- **Actions:** enter/submit 6–10 digit code; resend; go back.
- **Leads to:** restored previous/root flow and, for a new account, Onboarding.
- **Data:** route email parameter, OTP verification/resend result.
- **States:** default; incomplete/disabled; verifying; invalid/expired/network error; resend busy/sent; success.
- **Problems:** **Content consistency:** sign-in and deletion copy assume six digits while this accepts 6–10. **Feedback:** resend timing/availability is not a fully designed countdown state.

### 6. Profile onboarding — P0

- **Route:** `/(onboarding)/profile`
- **Purpose / user goal:** Understand the product and create the minimum profile required for participation.
- **Information:** step 1 product idea; step 2 product philosophy; step 3 username, display name, birth year, country, languages, optional city and bio, mandatory yes/no selection choice, privacy notes.
- **UI elements:** two Brand hero canvases, progress/step copy, navigation buttons, Text fields, country/language pickers, participation choice, privacy/delete link.
- **Actions:** advance/back between internal steps; validate/create profile; opt in/out of selection; open account deletion.
- **Leads to:** Today after creation; Account deletion.
- **Data:** authenticated user, locale, form values, country/language constants, profile insert response.
- **States:** introduction steps; blank/partially complete/valid form; field errors; under-16 rejection; username conflict; saving/server error; success. Modal swipe dismissal is disabled.
- **Problems:** **IA:** one route contains three separately designable screens. **Product contradiction:** country helper text implies geographic balancing may affect selection even though that is forbidden. **UX:** profile completion is compulsory after sign-in but contains a selection decision that needs especially neutral framing.

### 7. Selection invitation — P0

- **Route:** `/(selection)/invitation`
- **Purpose / user goal:** Calmly understand a time-limited selection and accept or decline without pressure.
- **Information:** selection date, 12-hour deadline/countdown, what accepting means, no-penalty reassurance.
- **UI elements:** branded/ceremonial hero, countdown, explanation surface, primary accept and secondary decline buttons, inline error.
- **Actions:** accept and continue; decline and return Today.
- **Leads to:** Portrait builder or Today.
- **Data:** pending invitation and current server-adjusted time.
- **States:** loading; no invitation; active; nearing deadline/urgent; expired; accepting/declining; action error.
- **Problems:** **Consistency:** this time-sensitive route has no native header and its exit behavior differs by state. **Accessibility:** countdown updates need restrained announcement behavior.

### 8. Build your portrait — P0

- **Route:** `/(selection)/portrait`
- **Purpose / user goal:** Create an authentic moderated portrait before the deadline.
- **Information:** selected photo; seven prompt/answer fields; completion count; requirement of photo plus at least five answers; save/review guidance.
- **UI elements:** page header, 4:5 image placeholder/preview, photo chooser, seven multiline fields, per-answer save status/error, progress surface, submit button, skeleton, toast.
- **Actions:** grant photo access; choose/crop/upload/replace photo; enter and autosave responses; submit for review.
- **Leads to:** Selection status.
- **Data:** pending journey, portrait draft/id/status, photo path/signed URL, answers and revision numbers.
- **States:** loading; not selected; draft blank/partial/ready; permission not determined/denied/limited/granted; image processing/upload error; autosaving/saved/conflict/failure; incomplete/disabled; submitting; rejected/resumable; success; cycle expired.
- **Problems:** **UX:** a single long seven-field form makes progress and recovery demanding. **Feedback:** autosave errors are not consistently anchored to individual fields. **State coverage:** permission recovery and cycle rollover need explicit designs.

### 9. Answer questions — P0

- **Route:** `/(selection)/questions`
- **Purpose / user goal:** During the live day, answer the audience's approved questions selectively.
- **Information:** question bodies, vote counts, existing answers, live-day context.
- **UI elements:** page header, question answer surfaces/fields, character count, save/update controls, toast, empty/skeleton states.
- **Actions:** write, publish or update an answer; return to status when not live.
- **Leads to:** Selection status/previous route.
- **Data:** active live journey, approved questions and existing answers.
- **States:** loading; not live; no approved questions; unanswered/answered; editing; disabled; saving; success/error; cycle rollover.
- **Problems:** **Hierarchy:** vote totals may appear more important to the selected Human than the right not to answer. **Feedback:** multiple per-card saving states need consistent treatment.

### 10. Selection status — P0

- **Route:** `/(selection)/status`
- **Purpose / user goal:** Understand the exact stage of the user's Human journey and take the next allowed action.
- **Information:** selection date, current stage, stage explanation, promise/reassurance.
- **UI elements:** page header, stage icon/surface, status copy, contextual CTA, promise card, skeleton/empty state.
- **Actions:** respond, continue portrait, answer questions, or inspect static wait/archive/rejection state.
- **Leads to:** Invitation, Portrait, Questions, Today/Archive depending on stage.
- **Data:** latest Human journey and derived action (`respond`, `write-portrait`, `await-review`, `await-live`, `answer-questions`, `archived`, `rejected`).
- **States:** loading; no journey; seven action variants; query error; stale transition around UTC rollover.
- **Problems:** **IA:** status is both a standalone route and a Journey card embedded in Today/You. **Consistency:** no shared visual timeline shows stage progression.

### 11. Archived Human detail — P0

- **Route:** `/human/[id]`
- **Purpose / user goal:** Read one past Human's full portrait and approved questions.
- **Information:** same public Human projection as Today, but without live countdown; questions/answers; translation and personal Remember state.
- **UI elements:** Human portrait, translation toggle, Question cards, Remember, Share, report/block, loading/error/tombstone.
- **Actions:** read; translate; Remember/forget; share; report; block; navigate back.
- **Leads to:** prior Archive/Remembered/notification context, Auth if a protected action is attempted.
- **Data:** draw id, archived Human, portrait elements/photo, questions/translations, Remember state/session.
- **States:** loading; request error/retry; invalid/not found; removed tombstone; populated; guest/member; translation partial; image missing; offline cached.
- **Problems:** **Navigation:** the visual header/back behavior is lighter than the amount of content warrants. **Consistency:** voting affordance remains visible but disabled because archived questions cannot be voted on.

### 12. Remembered Humans — P1

- **Route:** `/archive/remembered`
- **Purpose / user goal:** Revisit the private library of Humans the member chose to Remember.
- **Information:** chronological remembered entries and dates; no public/social count.
- **UI elements:** page header, Archive cards, skeleton, error/empty, Load earlier.
- **Actions:** open Human; load earlier; retry; return to Archive.
- **Leads to:** Human detail, Archive.
- **Data:** authenticated user's cursor-paginated remembered rows and signed photos.
- **States:** loading; error; empty first-use; populated; pagination busy/end; signed-out/RLS failure; offline unavailable.
- **Problems:** **First-use:** the emotional meaning of Remember is only explained in copy. **Offline:** private results intentionally are not persisted but the screen lacks a specialized explanation.

### 13. Edit profile — P1

- **Route:** `/settings/profile`
- **Purpose / user goal:** Maintain the public/minimal identity used for participation.
- **Information:** display name, username, country, optional city/bio, languages; birth year is not editable.
- **UI elements:** page header, Text fields, country/language pickers, save button, skeleton, inline errors.
- **Actions:** edit and save; go back.
- **Leads to:** You.
- **Data:** current Profile and update mutation.
- **States:** loading; populated/dirty; validation errors; username conflict; saving; server error; success/navigation back.
- **Problems:** **Feedback:** successful save is mainly communicated by navigation. **Identity:** no photo/avatar editing exists despite Avatar supporting image input and portraits using photographs.

### 14. Eligibility and draw — P1

- **Route:** `/settings/eligibility`
- **Purpose / user goal:** Understand whether and why the account can enter the fair draw, complete assurance, and opt in/out.
- **Information:** eligible/ineligible/permanent status, detailed reasons, attestation state/review, participation setting and explanation.
- **UI elements:** page header, semantic status surface, reason list, attestation action/review UI, switch row, educational link.
- **Actions:** verify device; request manual review; toggle participation; open If you are chosen.
- **Leads to:** If you are chosen; external/system attestation process.
- **Data:** Profile eligibility/assurance/account/rules/activity/age flags and attestation API state.
- **States:** loading; eligible; temporarily/permanently ineligible; provider unverified; unattested; review pending; action failure; switch saving.
- **Problems:** **Complexity:** many independent gates are presented in one list. **Trust:** device attestation wording must not overclaim proof of global uniqueness.

### 15. Notification preferences — P1

- **Route:** `/settings/notifications`
- **Purpose / user goal:** Enable push and choose the four product-essential notification categories.
- **Information:** daily Human, selected, answer, and anniversary category examples; push availability and non-engagement promise.
- **UI elements:** page header, grouped switch rows, enable button/status explanation, toast.
- **Actions:** request permission/register token; toggle each category.
- **Leads to:** system permission/settings indirectly; notification taps later lead into app routes.
- **Data:** native permission/token availability and saved settings.
- **States:** loading; Expo Go/web/unavailable; permission undetermined; denied; granted/unregistered; enabled; save/register error; success.
- **Problems:** **State clarity:** false defaults can resemble loaded preferences. **Consistency:** system-denied recovery is not a distinct strong state.

### 16. Privacy and your data — P1

- **Route:** `/settings/privacy`
- **Purpose / user goal:** Control city visibility, export personal data, and reach safety/removal tools.
- **Information:** country visibility rule, optional city state, collected-data explanation, items never collected.
- **UI elements:** page header, grouped rows/switch, export button, explanatory surfaces, toast.
- **Actions:** hide/show city; export via native share sheet; open Blocked, Appeals, Archive removal.
- **Leads to:** three privacy detail routes and native share sheet.
- **Data:** Profile privacy state and exported JSON document.
- **States:** profile loading/missing; city absent/present/hidden; exporting; export success/error; switch saving/error; offline.
- **Problems:** **Feedback:** setting mutation state is understated. **Content density:** controls and legal-style disclosure share one screen.

### 17. Community rules — P1

- **Route:** `/settings/community-rules`
- **Purpose / user goal:** Read and formally accept the rules required for selection eligibility.
- **Information:** eight numbered safety/behavior sections and acceptance status.
- **UI elements:** page header, Article sections, acceptance button/state, inline error.
- **Actions:** accept rules.
- **Leads to:** previous route/Eligibility.
- **Data:** Profile accepted-rules timestamp and acceptance RPC.
- **States:** unauthenticated/incomplete profile; not accepted; accepting; accepted; error.
- **Problems:** **Hierarchy:** a long legal-like document culminates in a state change without persistent navigation context. **Feedback:** accepted state is less explicit than destructive-flow confirmations.

### 18. How selection works — P1

- **Route:** `/how-selection-works`
- **Purpose / user goal:** Verify that selection is random, equal, noncommercial, safe and auditable.
- **Information:** pool, draw, acceptance/backups, once-only rule, verification/safety, things never used, live aggregate statistics and country representation.
- **UI elements:** page header, Article sections, Selection stats/representation displays.
- **Actions:** read/scroll; navigate back.
- **Leads to:** prior route.
- **Data:** static localized content plus public selection statistics/country representation.
- **States:** static; live stats loading/error/available/insufficient anonymity threshold.
- **Problems:** **Content hierarchy:** constitutional detail and live statistics need clearer distinction. **Contradiction risk:** all balance copy must remain measurement-only, never imply draw weighting.

### 19. If you are chosen — P1

- **Route:** `/if-you-are-chosen`
- **Purpose / user goal:** Understand the selected-person process before deciding whether to participate.
- **Information:** accept, write, review, live, and after/archive steps plus consent/reassurance.
- **UI elements:** page header and reusable numbered Article/step surfaces.
- **Actions:** read and navigate back.
- **Leads to:** previous route, usually You/Eligibility/Invitation context.
- **Data:** localized static copy.
- **States:** static only.
- **Problems:** **Consistency:** it describes the same lifecycle shown in Journey Status but with a different representation.

### 20. Appearance — P2

- **Route:** `/settings/appearance`
- **Purpose / user goal:** Select system, light, or dark appearance.
- **Information/UI:** page header; three selectable rows with current indicator.
- **Actions / leads to:** set preference; back to You.
- **Data:** local persisted preference.
- **States:** system/light/dark selected.
- **Problems:** **Visual:** white dark-mode splash can break the chosen dark experience at launch.

### 21. Delete account — P2

- **Route:** `/settings/account`
- **Purpose / user goal:** Understand and complete irreversible asynchronous account deletion.
- **Information:** consequences; current deletion stage; correlation/support detail; whether the account was published.
- **UI elements:** page header, danger surfaces/buttons, confirmation, email OTP reauthentication form, progress/status panels, retry/finish actions.
- **Actions:** request deletion; reauthenticate; resend; retry worker; finish/return.
- **Leads to:** Today after completion/session removal.
- **Data:** session freshness, email, deletion request state.
- **States:** explanation; destructive confirmation; recent-auth path; exact six-digit reauth; requested; account locked; storage/database/auth deleting; completed; retryable failure; manual review.
- **Problems:** **Content:** OTP length may differ from normal auth expectations. **Complexity:** many serious states need especially stable layout and support continuity.

### 22. Blocked users — P2

- **Route:** `/settings/blocked-users`
- **Purpose / user goal:** Review and reverse private blocks.
- **Information/UI:** page header; Avatar/name/country/list rows; Unblock action; loading/error/empty.
- **Actions / leads to:** unblock; back to Privacy.
- **Data:** private block list.
- **States:** loading; error; empty; populated; unblocking.
- **Problems:** **Feedback:** unblocking mainly removes the row with little explicit confirmation/undo.

### 23. Appeals — P2

- **Route:** `/settings/appeals`
- **Purpose / user goal:** Understand appealable decisions and submit a statement.
- **Information/UI:** decision action/target/reason/date, status pill, prior statement/resolution, multiline field and submit button.
- **Actions / leads to:** submit appeal; back to Privacy/Restricted.
- **Data:** private appealable decisions and mutations.
- **States:** loading; error; empty; eligible to appeal; submitting; pending; upheld; overturned.
- **Problems:** **Content/hierarchy:** moderation vocabulary may be difficult for nontechnical users; target content may no longer be visible.

### 24. Archive removal — P2

- **Route:** `/settings/archive-removal`
- **Purpose / user goal:** Request removal of a former Human portrait while preserving an anonymous tombstone.
- **Information/UI:** user's Human entries, number/date/removal status, optional reason, destructive action, explanation.
- **Actions / leads to:** request removal; back to Privacy.
- **Data:** eligible Archive entries and request states.
- **States:** loading; error; empty; available; pending; approved/removed; declined/cancelled; submitting.
- **Problems:** **Trust:** distinction between content removal, account deletion and permanent audit tombstone requires very precise copy.

### 25. Restricted account — P1

- **Route:** `/settings/restricted`
- **Purpose / user goal:** Explain why normal app use is blocked while preserving essential rights.
- **Information/UI:** suspended/banned/deletion-pending status, explanation, limited action buttons.
- **Actions / leads to:** Appeals, data export where available, Delete account.
- **Data:** global account status and deletion state.
- **States:** suspended; banned; deletion pending; status loading/fallback.
- **Problems:** **Navigation:** this global forced route must prevent all accidental escape while still allowing clearly bounded rights. **Tone:** punitive and deletion states require different emotional treatment.

### 26. Moderator console — P2/internal

- **Route:** `/admin`
- **Purpose / user goal:** Safely review publication/safety queues and monitor operations.
- **Information:** portrait photo/answers/identity/assurance/reports; questions/flags; reports/subject/content; assurance flags; appeals; removal requests; KPI funnels/retention/growth; fairness/integrity; jobs and alerts.
- **UI elements:** page header; eight horizontally scrollable tab pills; queue cards; images; note fields; approve/reject/action buttons; Signals and Operations panels; toast.
- **Actions:** approve/reject portrait/question/removal; dismiss/remove/suspend/ban; clear/uphold assurance; uphold/overturn appeal; resolve alerts; refresh.
- **Leads to:** remains in console/previous You.
- **Data:** moderator authorization plus multiple RPC queues and metrics.
- **States:** loading; unauthorized; each tab empty/error/populated; action busy/success/failure; destructive combinations.
- **Problems:** **IA:** eight different jobs in one route and horizontal tabs are dense. **Safety:** destructive actions need stronger differentiation/confirmation and audit context. This is operational UI, not part of consumer emotional redesign.

### 27. Not found — P2

- **Route:** `/+not-found`
- **Purpose / user goal:** Recover from an unknown or obsolete link.
- **Information/UI:** simple Empty state and return action.
- **Actions / leads to:** replace with Today.
- **Data:** none.
- **States:** static.
- **Problems:** **Deep-link recovery:** does not explain whether a Human link is invalid, expired, or removed; those valid route states are handled separately.

## Nonvisual compatibility route

### Today universal-link redirect

- **Route:** `/today`
- **Behavior:** immediately redirects to `/(tabs)`/Today. It needs no standalone design, but future navigation must preserve the URL contract.

## Development-only screens

These routes are protected by `__DEV__` and redirect to Today in release builds. They are useful implementation references, not consumer redesign targets.

| Screen | Route | Purpose | Priority |
| --- | --- | --- | --- |
| Components gallery | `/dev/components` | Renders Button, Avatar, Country badge, Timer, Skeleton, Question card, empty/error states, Sheet, Toast, Report, language selector and ceremonial animation variants | P2/dev |
| Design tokens | `/dev/tokens` | Visual swatches/examples for theme token families | P2/dev |
| UX preview | `/dev/preview` | Fabricated full Human/interaction preview without backend state | P2/dev |
| Share-card diagnostic | `/dev/share-card` | Tests off-screen share-card capture and native share sheet | P2/dev |

## Priority summary

- **P0 (9 routes):** Today, Archive, Sign in, Profile onboarding, Selection invitation, Build portrait, Answer questions, Selection status, Archived Human detail. Onboarding adds two extra internal canvases beyond its route-level count.
- **P1 (11 routes):** You, Verify email code, Remembered Humans, Edit profile, Eligibility and draw, Notification preferences, Privacy and your data, Community rules, How selection works, If you are chosen, Restricted account.
- **P2:** Appearance, Delete account, Blocked users, Appeals, Archive removal, Moderator console, Not found, and four developer tools.

For clarity, exact route counts are: **9 P0 production routes, 11 P1 production routes, 7 P2 production routes = 27 production visual routes**.
