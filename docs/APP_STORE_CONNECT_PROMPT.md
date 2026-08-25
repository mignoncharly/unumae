# ROLE

You are an experienced iOS App Store submission consultant. I am submitting my first
build of an iPhone app called **Unumae** to App Store Connect. I need you to help me
fill in every field App Store Connect asks for, and to prepare the App Review answers.

Everything under "VERIFIED FACTS" below is taken directly from the app's codebase,
config and internal documentation. **Treat it as ground truth. Do not invent, soften,
or contradict any of it.** If a field genuinely cannot be answered from these facts,
say so explicitly and ask me a specific question instead of guessing.

---

# THE PRODUCT

**Unumae** — tagline: *"8 billion people. One today."*

Every day, exactly one ordinary person from the community becomes **Today's Human**.
The world discovers their story for 24 hours (00:00–23:59 UTC, one single global
window for everyone on Earth), asks them questions, and remembers them permanently in
the **Human Archive**.

The person is chosen by a recorded, reproducible random draw among everyone eligible.
There are no followers, no rankings, no likes, no algorithmic feed, no infinite
scroll, and no way to pay for a better chance of being selected. Those are not missing
features — they are architecturally refused and enforced by database constraints and
build-time checks.

**The two loops:**

- *Audience:* open → meet Today's Human → read their portrait → ask a question / vote
  for someone else's question / "Remember" them → share → 24 hours pass → new Human.
  The experience deliberately **ends**; you reach the bottom and it is finished.
- *Selected person:* selected by the draw → 12 hours to accept or decline (declining
  costs nothing) → write a guided portrait (answer at least 5 of 7 prompts plus one
  photograph) → a human moderator reviews it → go live for 24 hours → answer whichever
  questions they choose → enter the Archive permanently.

**Key concepts, with their exact canonical names** (use these words, never synonyms):

| Term | Meaning | NEVER call it |
| --- | --- | --- |
| Today's Human | The one person published in the current cycle | "featured user", "creator", "the star" |
| Human | Any person published, past or present | "profile", "post" |
| Human number | Permanent sequential ID, e.g. `HUMAN #0128` | "rank" |
| The Archive | The permanent collection of past Humans | "history", "feed" |
| Remember | Adding a Human to your **private** library (the count is never public) | "like", "favourite", "heart" |
| Ask this | Upvoting a question so it reaches Today's Human | "like", "upvote" |
| The draw | The daily random selection | "the algorithm" |
| Quiet Day | A day published with no Human, honestly stated | "downtime", "outage" |

The seven guided portrait prompts are: introduce yourself · where I'm from · today I
feel · something I love · something people misunderstand · an ordinary moment I
treasure · something I'd tell the world. Questions from the audience are capped at 180
characters.

---

# VERIFIED FACTS (ground truth — do not contradict)

## Identity and technical

| Item | Value |
| --- | --- |
| App name | Unumae |
| Bundle ID | `com.unumae.app` |
| Apple Team ID | `UB67843RJK` |
| Apple ID (submitter) | charles.nguenkam@gmail.com |
| Platform | **iPhone only** at launch (`supportsTablet: false`). No iPad, no Mac, no Vision, no Watch, no TV. |
| Android | The codebase is cross-platform but no Android release is planned yet |
| Stack | React Native / Expo (SDK 57), Expo Router, Supabase backend, Edge Functions |
| Marketing version | 0.1.0 — first-ever submission, nothing previously on the store |
| Build numbers | Auto-incremented remotely by EAS |
| Orientation | Portrait only |
| Appearance | Supports Light and Dark (`userInterfaceStyle: automatic`) |
| Price | **Free.** No in-app purchases, no subscriptions, no paid tiers, no ads, no advertising SDK, no attribution SDK. |
| Encryption | Only exempt OS-supplied encryption and standard HTTPS. `usesNonExemptEncryption: false` is already encoded in the build config. |
| Universal links | `applinks:unumae.app` and `applinks:www.unumae.app`, association published for this Team ID and bundle |
| Custom URL scheme | `onehuman` |

## Localizations (App Store Connect must be filled in all three)

**English (U.S.)** — canonical, governs in any conflict. **French.** **German.**
The app UI, all legal text, and the marketing site are fully translated into these
three. There is no other language.

## Required URLs (all live, verified 23 August 2026)

| Field | Value |
| --- | --- |
| Privacy Policy URL | `https://unumae.app/privacy` |
| Support URL | `https://unumae.app/about` |
| Marketing URL | `https://unumae.app` |
| Terms of Use (EULA) | `https://unumae.app/terms` |
| Community guidelines | `https://unumae.app/community-guidelines` |
| How selection works | `https://unumae.app/how-selection-works` |

## Accounts and sign-in

- **Guest viewing is a permanent right.** Anyone can read Today's Human, their whole
  portrait, all questions and answers, and browse the entire Archive **without an
  account**. A person's story is never behind a signup wall.
- An account is required only to: propose a question, vote for a question, Remember a
  Human, enter the draw, report, and block.
- Sign-in methods: **Sign in with Apple** (implemented, entitlement configured, Apple
  provider enabled for `com.unumae.app`) and **email six-digit code** (OTP). No
  password. No Google, no Facebook.
- **Sign in with Apple is offered and required to be offered**, because a third-party
  sign-in path also exists.
- **Minimum account age is 16**, enforced by a database trigger — stricter than the
  age rating requires. Year of birth is collected only to check this.
- **In-app account deletion exists** and truly deletes rather than deactivates:
  **Settings → Delete my account**, reachable in two taps from the main screen. It
  removes the auth account, all profile data, photographs, questions and the private
  library. A dedicated `delete-account` Edge Function is deployed, and complete
  deletion (auth + data + media) is proven by an automated live test.

## Safety, moderation and UGC (this app has user-generated content)

- **Moderation happens before publication, not after.** Every portrait is reviewed by
  a real person before it can go live; the publication function in the database
  *refuses* to publish a portrait that has not been human-reviewed. Questions stay
  `pending` until approved. This is enforced in the database, not by policy.
- Four moderation layers: local validation → automated screening → **manual human
  review of every portrait** → continuous community reports.
- **Report** is available on every published portrait and every question.
- **Block** is available from the report sheet and from Settings; blocked people
  vanish from your view and are not notified.
- **There is no direct messaging, at any tier, for any user.** There is no private
  channel through which harassment could arrive, and no way to exchange contact
  details.
- **There are no replies to questions and no comment threads** — deliberately omitted
  as the largest source of toxicity in this category.
- **Voting is upvote-only. There is no downvote**, ever.
- Community rules must be explicitly accepted in-app before participating, and the
  acceptance is recorded in the database.
- Moderation decisions can be **appealed**, and a different moderator — never the one
  who made the original decision — reviews the appeal.
- Enforcement ladder: content removed → account suspended → account banned. Serious
  harm skips to the end and, where required, to the authorities. Sexual content
  involving minors is reported to the authorities.
- A published Human can request **removal from the Archive** at any time and it is
  granted; only a tombstone (their Human number and date) remains.
- Users can **export all their data** as a single JSON document.
- The developer-only section of Settings is gated behind `__DEV__` and its routes
  redirect in release builds, so no internal tooling is reachable in the shipped app.

## Privacy — the exact App Store privacy label answers

**Data Used to Track You: NONE.** Nothing follows anybody across other apps or
websites. No advertising SDK, no attribution SDK, no data broker.
`NSPrivacyTracking: false` in the privacy manifest. **Tick nothing on that screen.**

**Data Linked to You:**

| Category | Item | Purpose |
| --- | --- | --- |
| Contact Info | Email Address | App Functionality |
| Contact Info | Name | App Functionality |
| User Content | Photos or Videos | App Functionality |
| User Content | Other User Content | App Functionality |
| Identifiers | Device ID | Analytics |
| Usage Data | Product Interaction | Analytics |

Notes that matter:

- **Device ID** is a random per-installation UUID generated on device. It is not an
  advertising identifier. It exists only to answer "did people come back the next
  day", and it never leaves our own database. It is declared *linked* because once
  somebody signs in it sits in the same row as their user id — declaring it unlinked
  would be a technicality rather than the truth.
- **Analytics are first-party only** — a table in our own Supabase database. There is
  no third-party analytics SDK in the app.
- **Location is NOT collected.** The country on a profile is **typed by the person**,
  never read from the device. It must not be declared as Location data. City is
  optional and can be hidden. Precise location is never requested and must never
  become required.
- **Not collected at all:** location, contacts, health, fitness, financial info,
  browsing history, search history, sensitive info, purchases, physical address,
  phone number.
- **No biometric data.** An earlier draft required a liveness selfie; it was
  deliberately removed before beta. The app does not collect biometric data and does
  not advertise automated liveness.
- Permissions requested: **photo library only**, with the string *"Unumae uses your
  photo library so you can choose the photograph for your portrait."* Plus **push
  notifications**, optional.
- Required-reason APIs declared in the privacy manifest: UserDefaults (CA92.1), file
  timestamps (C617.1), disk space (E174.1).

## Notifications

Four categories only, each individually toggleable, all opt-in: *Today's Human*,
*Being selected*, *Your question was answered*, *One year ago*. The product explicitly
promises **no streaks, no reminders, and no "come back" messages**. If a category is
off, we do not contact the user about it at all.

## Age rating — the questionnaire answers that produce 12+

| Question | Answer | Why |
| --- | --- | --- |
| User-generated content | **Yes** | Portraits and questions |
| Content moderation | **Yes** | Every portrait human-reviewed before publication; questions reviewed before appearing |
| Ability to report content | **Yes** | On every portrait and question |
| Ability to block users | **Yes** | Settings and the report sheet |
| Contact information sharing | **No** | No DM, no way to exchange contact details |
| Unrestricted web access | **No** | The only outbound links are our own pages |
| Gambling / contests | **No** | The draw has no stake, entry fee or prize |

Target rating: **12+**. Minimum account age enforced in-app is **16**.

## The draw is NOT a sweepstake (anticipate this question)

There is no entry fee, no purchase, no prize of any value, and no way to improve the
odds by any means including payment. Being selected grants only the ability to publish
your own portrait for 24 hours, and nothing else. The product's binding constitution
forbids monetising selection probability, and the code has no mechanism to do it. The
draw is reproducible from a recorded pool hash and cryptographic seed, and anyone —
signed in or not — can verify it after the fact.

## Product principles that constrain the marketing copy

These are binding internal rules. Copy that contradicts them is wrong even if it would
convert better:

- No followers. No popularity contest. Nothing ranks humans against each other.
- No paying for a better chance, in any form, under any name.
- Equal chance among all eligible users — equal means equal, not lightly weighted.
- Exactly one person per day, never two, never a "featured also".
- Discovery before infinite consumption. **The experience ends.**
- A permanent archive.
- International from day one — not an English product with translations bolted on.
- Moderation before publication.
- Extremely simple design: the person is the star, the interface is furniture.
- No TikTok-style feed, no infinite scroll, no autoplay chain.
- The Remember count is never public. No number ever appears under a human.
- Someone's own words in their own language are never overwritten by a machine
  translation; translation is additive and labelled Original / Translated.
- The tone is editorial, documentary, premium and calm — not a flashy social app, not
  a SaaS dashboard.

## Current launch state (be honest about this in the review notes)

- This is the **first build ever submitted**. The App Store Connect app record for
  `com.unumae.app` already exists.
- The app is functionally complete: the full daily loop (draw → invitation →
  acceptance → portrait → moderation → publication → questions → Archive) has been
  verified end to end against the live database, including escalation to backup
  candidates when the first person declines or does not answer.
- **The Archive may be empty or nearly empty at review time**, and there may be no
  Human published on the day a reviewer opens it. In that case the app shows an
  honest **Quiet Day** screen — a calm explanation that no human is published today,
  with an entry point into the Archive — rather than fabricated content.
- Screenshots are still to be produced.

---

# WHAT I NEED FROM YOU

Produce a complete, copy-paste-ready App Store Connect submission pack. Work through
**every** section below. Respect Apple's exact character limits and count them.

## 1. App Information

- **Name** (max 30 chars) — I intend to use "Unumae". Tell me whether to pair it with
  anything and why, and confirm the count.
- **Subtitle** (max 30 chars) — give me 5 options, ranked, with your recommendation.
  It must convey the one-person-a-day idea, not generic "social" language.
- **Primary category** and **Secondary category** — genuinely ambiguous here
  (candidates: Social Networking, Lifestyle, Education, News, Reference). Recommend
  one primary and one secondary, explain the trade-off, and say how the choice
  interacts with App Review's expectations for user-generated content.
- **Content rights** — does this app contain, show or access third-party content?
  Answer it for me and explain the reasoning.
- **Age rating** — restate the questionnaire answers exactly as I should tick them,
  using the table above.

## 2. Pricing and Availability

Price tier and availability recommendation, including whether to launch in all
territories at once given the app is localised only into EN/FR/DE.

## 3. Version Information — for each of English (U.S.), French, and German

- **Promotional text** (max 170 chars)
- **Description** (max 4000 chars). Structure it: a strong opening paragraph, then how
  a day works, then what the product refuses to be (this is the real differentiator),
  then the practical facts (free, no account needed to read, three languages). No
  bullet-point spam, no keyword stuffing. Match the calm, editorial tone.
- **Keywords** (max 100 chars, comma-separated, no spaces after commas, no repetition
  of words already in the name or subtitle, no competitor names, singular forms).
  Explain your choices briefly.
- **What's New** — this is the first release; tell me what belongs here.
- **Support URL / Marketing URL** — restate from the facts above.
- For French and German: **translate the intent, not the words.** The canonical
  vocabulary above must be rendered idiomatically and used consistently. Flag any term
  where a literal translation would be wrong or would import a connotation the English
  deliberately avoids.

## 4. Screenshots and App Preview

- Tell me exactly which sizes are **required** and which are optional for an
  iPhone-only app under the current App Store Connect requirements.
- Propose a **shot list of 5–8 screenshots in order**. For each: which screen of the
  app it shows, the caption overlay text in all three languages, and why it earns its
  slot.
- Note explicitly that any screenshot depicting a real published Human requires a real
  cycle to have run, and suggest how to handle that constraint honestly — no
  fabricated people, no invented testimonials.

## 5. App Privacy

- Restate the complete privacy label configuration exactly as I should click through
  it, section by section, using the table above. For each data type: whether it is
  linked, whether it is used for tracking, and which purposes to tick.
- Flag every place where App Store Connect's wording could tempt me into the wrong
  answer — especially Location versus a self-typed country, and Device ID versus an
  advertising identifier.

## 6. App Review Information

- **Sign-in required?** Answer this correctly given that all content is readable as a
  guest but participation requires an account. Advise whether to supply demo
  credentials anyway, and what kind of account it should be.
- Write the **Notes for App Review** field in full, ready to paste. It must pre-empt,
  in this order:
  1. That the app is fully usable as a guest, with no account.
  2. The exact path to account deletion: *Settings → Delete my account*.
  3. That the daily Human may not be live at review time, and that the Quiet Day
     screen is intended, honest behaviour rather than a bug or an empty state.
  4. That the daily draw is **not** a sweepstake or contest — no entry fee, no prize,
     no purchasable advantage.
  5. How UGC is moderated: human review before publication enforced in the database;
     report and block on every surface; no DM; community rules accepted in-app; appeal
     path to a different moderator.
  6. Sign in with Apple availability, and how to test the email six-digit code path.
  7. Anything else you expect a reviewer to ask.
  Keep it factual and tight — reviewers skim.
- **Contact information** — what to put and why.
- **Attachment** — advise whether to attach anything.

## 7. Export compliance, IDFA and other declarations

- Walk me through the export compliance answers given that `usesNonExemptEncryption:
  false` is already in the build config.
- Confirm the IDFA / advertising identifier answer.
- Any other declarations a first submission triggers.

## 8. Rejection risk assessment

List the App Store Review Guidelines this app is most likely to be challenged under.
I already expect **1.2 (user-generated content)**, **5.1.1(v) (account deletion)**,
**4.8 (Sign in with Apple)**, and possibly a **sweepstake/contest** query. For each:
the exact guideline number, why it might be raised here, what in the app already
satisfies it, and the one sentence I should have ready in response. Add any risks I
have not thought of.

---

# RULES FOR YOUR OUTPUT

1. **Count characters** for every length-limited field and show the count in
   parentheses. Never exceed a limit.
2. **Do not invent facts** — no user numbers, no press quotes, no awards, no
   "trusted by", no features absent from the list above. If a claim would need a fact
   I have not given you, leave a clearly marked `[[TODO: ...]]` placeholder.
3. **Never use the forbidden vocabulary** in any copy: followers, likes, feed,
   trending, viral, top, ranking, leaderboard, streak, algorithm, creator, influencer,
   "most popular". Reference them only as things the app deliberately does *not* have.
4. **Do not describe Unumae as "a social network"** without immediately qualifying it,
   and never imply that follower counts or audience-building are possible.
5. Marketing copy must be **calm, concrete and editorial**. No exclamation marks, no
   growth-hack urgency, no emoji in the description.
6. Where a choice is genuinely mine to make (category, subtitle, territories), **give
   a recommendation first**, then the alternatives and the trade-off. Do not hand me
   an undifferentiated menu.
7. Format the answer so each field can be copied straight into App Store Connect: a
   clear heading per field, the value in a code block or block quote, and any
   commentary kept outside it.
8. Finish with a **checklist of everything still blocking submission** that only I can
   do — screenshots, a real published cycle, the first EAS build, and so on — in the
   order I should do them.
