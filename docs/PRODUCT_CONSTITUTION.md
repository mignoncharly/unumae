# ONE HUMAN — Product Constitution

> **8 billion people. One today.**

**Status:** binding · **Version:** 1.0 · **Adopted:** 2026-08-22 · **Phase:** 0

---

## How to read this document

This is not a specification and not a roadmap. It is the set of rules that decides,
in advance, what ONE HUMAN is allowed to become.

Every future feature request is measured against this file. If a feature contradicts
Article 1, the feature is rejected — not the article. The purpose of writing this
before any code exists is to make the expensive answer ("no") cheap to give later,
when the pressure to grow will be real and the reasons to compromise will sound
excellent.

**Amendment rule.** Articles 2 through 11 may be amended by adding an entry to the
Amendment Log (Article 13) stating the date, the change, and the reason. **Article 1
cannot be amended.** A product that needs to change Article 1 is a different product
and must be given a different name.

**Language.** English is the canonical language of this document, of the codebase, and
of the product. Translations may exist; in any conflict, the English text governs.

---

## Article 1 — Non-negotiable principles

These thirteen rules are the identity of the product. They are not subject to
experimentation, A/B testing, growth targets, or investor preference.

1. **No followers.** No user may accumulate an audience.
2. **No popularity contest.** Nothing in the product ranks humans against each other.
3. **No paying for a better chance.** Selection probability is never for sale, in any
   form, under any name.
4. **No priority for influencers.** Existing fame is not an input to any system here.
5. **An equal chance among eligible users.** Equal means equal — not weighted, not
   "lightly" weighted.
6. **One principal human per cycle.** Never two. Never a "featured also".
7. **Discovery before infinite consumption.** The experience ends. That is the point.
8. **Human content before viral content.** Interestingness is never optimized for reach.
9. **A permanent archive.** What enters the Archive stays, subject only to Article 8.
10. **International from day one.** Not an English product with translations bolted on.
11. **Protection against bots and fraud.** A human product requires proof of humans.
12. **Moderation before publication.** Nothing reaches the world unreviewed.
13. **Extremely simple design.** The person is the star, never the interface.

And one prohibition that follows from all of them:

14. **No TikTok-style feed.** No infinite scroll, no autoplay chain, no algorithmic
    stream of humans.

---

## Article 2 — Core promise

> Every day, one ordinary person from the community becomes Today's Human.
> The world discovers their story for 24 hours, asks them questions,
> and remembers them forever in the Human Archive.

Three commitments are contained in that sentence, and each one is load-bearing:

| Commitment | What it forbids |
| --- | --- |
| **Ordinary** | Curating for the interesting, the beautiful, the articulate, or the famous. |
| **One** | A second slot, a runner-up, a "humans you may also like". |
| **Forever** | Deleting the Archive for storage cost, engagement, or freshness. |

---

## Article 3 — Core loop

For everyone:

```text
OPEN
 ↓
MEET TODAY'S HUMAN
 ↓
DISCOVER THEIR STORY
 ↓
ASK / VOTE / REMEMBER
 ↓
SHARE
 ↓
24 HOURS
 ↓
NEW HUMAN
 ↓
RETURN
```

For the selected person:

```text
SELECTED
 ↓
ACCEPT
 ↓
TELL YOUR STORY
 ↓
MODERATION
 ↓
BECOME TODAY'S HUMAN
 ↓
ANSWER THE WORLD
 ↓
ENTER THE ARCHIVE
```

The loop must remain describable in these two blocks. If a proposed feature cannot be
placed inside one of them, it is a candidate for rejection.

---

## Article 4 — The Cycle

### 4.1 Definition

| Parameter | Value | Notes |
| --- | --- | --- |
| Duration | **24 hours** | Exactly. Not "about a day". |
| Frequency | **Daily**, without interruption | One cycle per calendar date, no skipped days. |
| Cycle clock | **00:00:00 → 23:59:59 UTC** | One single global window. |
| Humans per cycle | **Exactly 1** | See Article 1.6. |
| Countdown | Shown to every viewer, in their local time | The remaining time is identical for everyone. |

**One global clock.** The cycle is the same instant for all 8 billion people. It does
not roll by timezone and it does not begin at each user's local midnight. This is what
makes "the world discovers them together" literally true, and it is what makes a live
question-and-answer window coherent. The cost is accepted knowingly: the cycle flips
mid-afternoon in East Asia and late evening in the Americas.

**Consequence for engineering.** `selection_date` is a UTC date. All cycle boundaries,
draw jobs, acceptance deadlines, and archive transitions are computed in UTC. Local
time is a presentation concern only, never a storage or logic concern.

### 4.2 Cycle timeline

```text
D-2  00:00 UTC   build eligibility pool
D-2  00:00 UTC   freeze candidate pool  → hash recorded
D-2  00:05 UTC   secure random draw → primary + backup 1, 2, 3
D-2  00:10 UTC   notify primary: "You were selected."
D-2  12:10 UTC   acceptance deadline for primary (12 hours)
D-1               portrait creation by the accepted candidate
D-1               moderation review (Layer 3, human)
D-1  22:00 UTC    portrait must be approved and ready
D    00:00 UTC    Today's Human goes live
D    23:59 UTC    cycle ends
D+1  00:00 UTC    Human enters the Archive, permanently
```

### 4.3 Cycle states

```text
scheduled
selected
awaiting_acceptance
accepted
content_review
ready
live
completed
cancelled
replacement_required
```

A cycle may only move forward through these states. `cancelled` and
`replacement_required` are the only branches.

---

## Article 5 — Selection fairness

This article is the reason the product deserves to exist. It is also the article most
likely to be quietly eroded. Treat every proposed exception to it as an attack.

### 5.1 Eligibility

A user enters the candidate pool only if **all** of the following are true:

```text
account status is active
not banned, not suspended, not shadow-restricted
age ≥ 16                          (see Article 8.4)
profile completed
country known
human verification passed
community rules accepted
eligible_for_selection = true
```

Deferred to a later phase, but reserved here so that adding them later is not a
change of policy:

```text
recently active
not a duplicate identity
```

**Eligibility is binary.** There is no eligibility score, no tier, no "more eligible".
A user is in the pool or is not in the pool, and every user in the pool has exactly
the same probability.

### 5.2 The draw

* The pool is **frozen** at D-2 00:00 UTC. A user who becomes eligible at 00:01 waits
  for tomorrow's pool. This makes the draw reproducible.
* A **hash of the frozen pool** and a **cryptographically secure random seed** are
  recorded before the draw, and are never modified afterwards.
* The draw selects **one primary and three backups** in a single ordered operation.
* Every draw is written to `daily_draws` and is **permanently auditable**. A draw is
  never deleted, even when cancelled.
* `ORDER BY RANDOM() LIMIT 1` is explicitly forbidden as a selection mechanism. The
  draw must be reconstructable from the recorded seed and pool hash.

### 5.3 Inputs that are forbidden in the draw

Not "discouraged" — forbidden. The selection engine must not read, join against, or
receive as a parameter:

```text
payment status          subscription tier        follower count of any kind
engagement metrics      session count            content quality score
sponsorship             admin preference         nationality quotas
beauty / photo scoring  language                 profile completeness beyond the binary
```

Country balance may be **measured and published** (Article 12) but must never
**influence** the draw.

### 5.4 One human, one day, forever

A user who has been Today's Human is **permanently removed from all future pools**.
There is no cooldown period and no second turn.

`Where Are They Now?` revisits an *archived* Human. It is a revisit, not a new draw,
and it does not create an exception to this rule.

### 5.5 If the selected person does not respond

The primary candidate has **12 hours** from notification to accept.

```text
primary       no response after 12h  → backup 1
backup 1      no response after 12h  → backup 2
backup 2      no response after 12h  → backup 3
backup 3      no response after 12h  → emergency re-draw
```

An **emergency re-draw** draws a new candidate from the *same frozen pool*, excluding
everyone already contacted for this cycle, and records a new row with an incremented
`draw_version`. The original row is kept.

Silence carries **no penalty**. A user who never answers is not banned, not
deprioritized, and — because of Article 5.4's inverse — returns to the pool for
future cycles. Not everyone checks their phone.

### 5.6 If the selected person declines

Declining is a legitimate, one-tap action, offered in the notification itself.

* The next backup is notified immediately, without waiting out the 12 hours.
* The user returns to the pool for future draws. Declining is not a black mark.
* A user may set `eligible_for_selection = false` at any time to leave the pool
  entirely, and may re-enter later. Leaving the pool costs nothing and grants nothing.

**No one is ever published without their explicit acceptance.**

### 5.7 If the selected person is banned

| When | What happens |
| --- | --- |
| Between draw and acceptance | Immediate replacement by the next backup. The draw row is kept for audit; no content exists yet. |
| Between acceptance and going live | Cycle returns to `replacement_required`; portrait content is deleted, not published. |
| While live | The portrait is unpublished within the cycle. The day is **not** replaced — a cycle has one human, and a removed human is not substituted mid-flight. The app states plainly that the day's Human was removed. |
| After archiving | The Archive entry is redacted or removed under Article 8.6. The `daily_draws` audit row survives in all cases. |

### 5.8 If no cycle can be filled

If, by **22:00 UTC on D-1**, no candidate has accepted and passed moderation, the
cycle is marked `cancelled` and the app shows a **Quiet Day**: an honest, calm screen
explaining that no human is being published today, with an entry point into the
Archive (Random Human).

A Quiet Day is a visible failure and is expected to be rare. It is deliberately
preferred over the three alternatives — publishing an unreviewed portrait, publishing
someone who did not consent, or inventing a human.

---

## Article 6 — Participation

### 6.1 What any user may do

Without an account:

* discover Today's Human;
* read their portrait;
* read the questions and answers;
* explore the Human Archive;
* share.

**Guest viewing is a permanent right, not a growth experiment.** The story of a human
is never behind a signup wall. Any change that gates viewing behind an account is an
amendment to this article and must be logged.

With an account:

* propose a question;
* vote for questions;
* Remember a human;
* enter the draw;
* report and block.

### 6.2 What no user may do

```text
build a personal feed
accumulate followers
promote their profile commercially
buy additional chances
contact Today's Human privately and arbitrarily
```

These are not missing features. They are refused features.

### 6.3 Today's Human's rights

The person being published is the most exposed participant in the system and holds
rights the audience does not:

* to **decline** before publication, with no consequence;
* to **choose** which portrait elements to fill in beyond the required minimum;
* to **not answer** any question, without explanation;
* to **withhold** their city, their exact age, and their last name;
* to request **removal from the Archive** after the fact (Article 8.6);
* to be **protected from private contact** — there is no DM, so there is no channel
  for harassment to arrive through.

---

## Article 7 — Non-goals

### 7.1 Features the product will not have

```text
followers            DM                    comments on comments
reels                stories               groups
rankings             leaderboards          streaks
trending             "most liked"          "top human"
creator monetization marketplace           social graph
algorithmic feed     infinite scroll       autoplay chains
```

### 7.2 Columns forbidden in the database schema

The refusal is enforced at the schema level, so that a future contributor cannot add
the behaviour by accident:

```text
followers
following
popularity_score
likes_received
engagement_score
reach
```

If a migration introduces any of these, the migration is rejected in review. The rule
is enforceable by a test, and Phase 1 should write that test.

### 7.3 Deliberately deferred

Not refused, but explicitly outside the MVP: search and discovery filters, AI-assisted
interviewing, translated user content, Android, full PWA, subscriptions.

---

## Article 8 — Safety principles

### 8.1 Moderation before publication

Nothing produced by a user reaches the world unreviewed. Four layers, in order:

| Layer | What | When |
| --- | --- | --- |
| 1 | Local validation (length, format, required fields) | At input |
| 2 | Automated content screening | On submission |
| 3 | **Manual human review** of every portrait | Before going live |
| 4 | Community reports | Continuously |

Layer 3 is non-optional and does not scale by being skipped. One portrait per day is
a workload chosen, in part, because a human can actually review it.

### 8.2 Privacy by default

* **Country is sufficient.** Precise location is never required, and must never
  become required.
* City is optional and hideable. Exact age is optional; a year of birth range is
  enough to display "in their 30s".
* Every user may: delete their account, export their data, hide their city, hide
  their age, report, and block.
* Deleting an account deletes the media. See 8.6 for the Archive interaction.

### 8.3 No private channel

There is no direct messaging in ONE HUMAN, at any tier, for any user. This removes
the primary vector by which exposure turns into harassment. It is listed under safety
rather than features because that is its actual function.

### 8.4 Minors

**Minimum age to hold an account: 16.** This clears the GDPR digital-consent age in
every EU member state without parental-consent machinery, and keeps globally-published
portraits of children out of the product entirely.

Age is a hard eligibility gate, not a warning. Selection eligibility may be raised
above 16 later; it may never be lowered below it without amending this article and
re-examining the entire moderation model.

### 8.5 Proof of humanity, progressively

Friction is applied where the risk is, and nowhere else:

| Stage | Requirement |
| --- | --- |
| Viewing | None. No account. |
| Signup | Apple or email. |
| Interacting (ask, vote, Remember) | Account + rate limiting. |
| **Selection eligibility** | Account age minimum, activity, device signals, optionally phone. |
| **On being selected** | Liveness / selfie verification before publication. |

> Low friction to discover. High assurance only where it matters.

### 8.6 The Archive and the right to be forgotten

The Archive is permanent (Article 1.9) and a person's right to leave it is real. These
conflict, and the conflict is resolved in the person's favour:

* A Human may request removal of their Archive entry at any time. It is granted.
* A removed entry leaves a tombstone: the human number and the date remain, the
  content does not. The Archive's integrity as a sequence is preserved; the person is
  not.
* Content removed for a violation is treated identically from the outside. The reason
  is never published.
* `daily_draws` audit rows are retained in all cases — they contain no published
  content and are what makes fairness verifiable.

---

## Article 9 — Content rules

### 9.1 The portrait

The portrait is **guided**, never a blank textbox. An empty box produces
"Hi guys, I'm John" and kills the product.

The nine available elements:

```text
1  photo
2  mini introduction
3  where I'm from
4  today I feel
5  something I love
6  something people misunderstand
7  an ordinary moment I treasure
8  something I'd tell the world
9  optional audio / video
```

**The MVP asks for 5 to 7 of them.** Every element beyond the required minimum is
optional, and skipping one is never displayed as an absence.

The guidance must never write the person's personality for them. Prompts elicit;
they do not compose.

### 9.2 Questions

* Authenticated users only.
* **Maximum 180 characters.** Short questions produce answerable questions.
* Pipeline: `submitted → automated moderation → approved → visible → voting → top
  questions → Today's Human answers`.
* **No replies to questions.** No comment threads, at MVP or after. This single
  omission removes the largest source of toxicity in the product's category.
* Today's Human answers what they choose to answer.

### 9.3 Voting

* **Upvote only.** The label is "Ask this", not "like".
* **There is no downvote.** A downvote turns an audience into a jury, and this
  product does not put humans on trial.
* One vote per user per question, enforced by a unique constraint, not by the client.

### 9.4 Remember

Remember is the product's only emotional counterpart to a Like, and it is
deliberately not a Like:

* The **count is not public.** No number appears under a human, ever.
* Remembering adds the human to the user's private `Humans I remember` library.
* The mechanic is a personal library, not a scoreboard. That distinction is the whole
  design.

### 9.5 The Archive

Browsable by: `Today`, `Yesterday`, `One year ago`, `Random Human`, `Country`, `Year`.

Never by: `most liked`, `top human`, `viral`, `trending`, or any other ordering that
implies one human was better than another.

### 9.6 Translation

* UI strings: conventional translation. **No hardcoded UI text, ever.**
* MVP languages: **English (canonical), French, German.**
* User-generated content: translation is **additive**. The original text is never
  replaced, and both are labelled `Original` / `Translated`.

Someone's own words in their own language are part of who they are. Overwriting them
with a machine translation is a form of erasure, and is forbidden.

---

## Article 10 — Monetization principles

### 10.1 The absolute rule

```text
Selection probability = NEVER monetized
```

Not through subscriptions, not through "supporter" tiers, not through partner
programs, not through sponsored days, not through any mechanism invented after this
document was written. If money can influence who becomes Today's Human, the product
has failed and should be shut down rather than shipped.

### 10.2 Sequencing

Monetization is not attempted until retention is demonstrated (D1 and D7 measured on
real users). A product that monetizes before it is loved monetizes the wrong thing.

### 10.3 Permitted directions

* **Human Archive+** — advanced archive exploration.
* **Yearbooks** — physical books: *365 Humans — 2027*.
* **Documentary** — long-form stories, with consent.
* **Institutional / educational** — cultural exploration licensing.
* **Carefully controlled sponsorship** — with zero influence on selection, on
  moderation, or on which questions are answered.

### 10.4 Permanently forbidden

```text
paid boost of any kind
paid re-entry into the pool
paid visibility
sponsored humans
advertising inside a portrait
selling user data
```

### 10.5 No paywall on a human's story

Whatever is sold, the daily human and the Archive's core remain free and open to
guests. A human's story is never the thing behind the paywall.

---

## Article 11 — Design principles

* The person is the star. The interface is furniture.
* Editorial, documentary, premium, calm. Not a SaaS dashboard, not a flashy social app.
* Animation is discreet. `Selecting tomorrow's human…` may be beautiful; it may never
  be a slot machine.
* **The experience ends.** You reach the bottom of Today's Human, and it is finished.
  This limitation is a feature and must survive every future redesign.
* Accessibility is not optional: Dynamic Type, VoiceOver, contrast, reduced motion,
  captions, alt text. A product addressed to 8 billion humans is accessible or it is
  lying about its ambition.

---

## Article 12 — Transparency

The product must be able to answer, publicly and at any time:

> Why was this person selected?

A permanent **How selection works** page states: the selection is random; there is no
payment; there are no follower counts; there are no boosts; there are no sponsors;
here are the eligibility criteria; here are the safety exclusions; here is the
one-human-one-day-forever rule.

Publishable statistics — measured, never used as draw inputs:

```text
1,042 Humans waiting
43 countries
137 languages
```

A cryptographically verifiable draw is a goal, not an MVP requirement. The pool hash
and recorded seed exist from day one so that it remains possible later.

---

## Article 13 — Amendment log

| Date | Article | Change | Reason |
| --- | --- | --- | --- |
| 2026-08-22 | — | Constitution adopted, v1.0 | Phase 0 |

---

## Appendix A — Canonical vocabulary

These words have one meaning and one spelling across the product, the code, and the
documentation.

| Term | Meaning | Never called |
| --- | --- | --- |
| **Today's Human** | The one person published during the current cycle | "the star", "featured user", "creator" |
| **Human** | Any person published, past or present | "profile", "post" |
| **Human number** | The permanent sequential ID, e.g. `HUMAN #0128` | "rank" |
| **The Archive** | The permanent collection of past Humans | "history", "feed" |
| **Remember** | Adding a Human to your private library | "like", "favourite", "heart" |
| **Ask this** | Upvoting a question | "like", "upvote" |
| **The draw** | The daily random selection | "the algorithm" |
| **Candidate** | A user in the frozen pool for a given cycle | "applicant", "nominee" |
| **Quiet Day** | A cycle published with no Human | "downtime", "missed day" |

## Appendix B — Decisions fixed in this document

For traceability, the parameters that were open in the plan and are now closed:

| Parameter | Value | Article |
| --- | --- | --- |
| Cycle clock | 00:00 UTC, one global window | 4.1 |
| Minimum account age | 16 | 8.4 |
| Re-selection | Never | 5.4 |
| Acceptance window | 12 hours | 5.5 |
| Backup candidates | 3, then emergency re-draw | 5.5 |
| Pool freeze | D-2 00:00 UTC | 5.2 |
| Portrait elements at MVP | 5–7 of 9 | 9.1 |
| Question length | 180 characters | 9.2 |
| Voting | Upvote only | 9.3 |
| Remember count | Private | 9.4 |
| MVP languages | EN (canonical), FR, DE | 9.6 |
| Unfillable cycle | Quiet Day | 5.8 |
