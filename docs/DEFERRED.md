# Deliberately not built

Three features from Phase 16 are designed here and not implemented, because the
plan excludes them from the MVP in as many words:

> **PHASE 37 — AI Interview Assistant.** *Pas au MVP.*

and the MVP definition lists, under "Ce que le MVP ne doit PAS avoir":

> AI interviewer · advanced recommendations · Android · full PWA · paywall ·
> RevenueCat · creator monetization · complex profiles · social graph

The plan also classifies phases 16–17 as macro-phase **H — Scale**, marked
`❌ post-launch` — the only group of the eight that is not a launch blocker.

So the scale *infrastructure* is built (see `docs/OPERATIONS.md`) and the three
product features below are recorded rather than shipped. Writing the design down
now is worth something: it means the decision was made, not forgotten, and the
next person does not have to re-derive the constraints.

> *"Ce refus de features sera presque aussi important que ce que nous
> construisons."*

---

## AI Interview Assistant

When you are selected, an AI talks with you and helps you find what is worth
saying:

> Tell me about yourself.
>
> — You mentioned your grandfather taught you to repair watches. Tell me more.

**The constraint that makes it safe, and it is not a small one: the AI must
never write a personality.** It interviews. Every word in a portrait has to be
the person's own, or the product is a machine for generating plausible strangers
and the Archive is worthless.

That is enforceable the same way everything else here is — structurally rather
than by intention:

- The portrait element already stores exactly what the person typed. An
  assistant would write into a *separate* draft table, and promoting a
  suggestion into an answer would be an explicit act by the person, never a
  default.
- The prompt would be a question. A model that returns prose rather than a
  question is a bug, and the response shape can enforce it.
- `portrait_element_translations` is the precedent: added alongside the
  original, never in place of it (Article 9.6). The same rule applies.

Why it is genuinely interesting: the hardest part of this product is that most
people, asked to describe themselves in a blank box, write nothing worth
reading. The guided prompts (Article 9.1) are the MVP's answer. An interviewer
is the better one, and the plan is right that it could be the real
differentiator.

Why it is not in the MVP: it puts a language model between a person and their
own words on day one, before anybody has seen whether the guided prompts are
enough. If they are, this is an improvement. If they are not, we would never
find out, because the model would be covering for the product.

## Human Story Engine

Learning which questions let ordinary people reveal something interesting —
by culture, by age, by context. Explicitly without chasing clickbait.

This is the moat if it works, and it needs a corpus that does not exist yet. It
also needs a definition of "interesting" that is not "engagement", and this
product has deliberately made engagement unmeasurable per person: there are no
view counts, no Remember counts, no rankings. Working out what to optimise
against without reintroducing any of those is the actual research problem, and
it should not be solved in a hurry.

## Where Are They Now?

```
Human #231
2027

→ revisit in 2032
```

Then and Now, side by side. Probably the most emotional feature the product will
ever have, and it needs one thing nothing can shorten: five years.

Worth noting now because it constrains today's decisions — it only works if the
Archive is permanent, if human numbers are never reused, and if a person can be
found again. All three are already true (Article 1.9, the tombstone rule in
Article 8.6, `human_number_seq` never rewound except by the simulation cleanup).
Nothing needs building for it yet, and nothing must be broken.

---

## Also deferred, by the same plan

**Monetization** (Phase 17) — only after retention is demonstrated, and with one
line that is not negotiable:

```
Selection probability = NEVER monetized
```

**Android** (Phase 17) — the architecture is cross-platform and development
happens in Expo Go on Android, but no Android-specific work has been done.

**Full web/PWA** (Phase 17) — the website is the archive and the share surface;
the native app is the product.
