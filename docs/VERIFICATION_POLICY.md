# Verification policy

What makes someone eligible for the draw, and what makes them safe to publish.
Implements Product Constitution Article 8.5.

**Status:** revised for beta · **Adopted:** 2026-08-24 · **Phase:** 5

---

## The principle it has to satisfy

> Low friction to discover. High assurance only where it matters.

Two different things are being protected, and conflating them is the usual
mistake:

| Risk | What goes wrong | Where the friction belongs |
| --- | --- | --- |
| A bot **enters the pool** | Dilutes everyone's chance; a botnet could farm selections | Cheap, automatic checks |
| A bot or impostor **gets published** | A fabricated person is presented to the world as real | Expensive, human-grade checks |

Entering a pool costs the world nothing. Being published to it is irreversible.
So the bar rises sharply at exactly one moment: selection.

## The bar to enter the pool

`selection_eligible` becomes true when **all** of these hold:

```text
account_status = 'active'
verification_level <> 'none'      -- email confirmed, or Apple
account is at least 7 days old
```

And the draw additionally requires, at pool-freeze time:

```text
wants_selection = true            -- the user's own choice (Article 5.6)
accepted_rules_at is not null
age >= 16
never previously selected
```

### Why seven days

The pool freezes two days before a cycle. Seven days of account age means an
attacker cannot register accounts for tomorrow's draw — anything created inside
the last week is not in the frozen pool at all. Combined with per-account email
confirmation, mass entry stops being a same-day operation and becomes a
sustained one, which is a much smaller problem and a visible one.

It also costs a genuine new user nothing they would notice. Nobody signs up for
this product in order to be drawn the next morning.

### What is deliberately *not* required to enter

- **No phone number.** It excludes people in exactly the places this product
  most wants to hear from, and it is the single most effective way to make a
  global product quietly Western.
- **No device attestation.** Useful against farms, but it fails on rooted
  devices and older hardware, which again excludes the wrong people.
- **No liveness check.** Asking eight billion people for a selfie to enter a
  lottery they will probably never win is absurd, and it would be the largest
  biometric collection in the product for no proportionate benefit.

Phone and device signals are reserved as **responses to observed abuse**, not
as a default toll. If a farm appears, they can be required of new accounts
without amending this document — the columns exist.

## The bar to be published

When someone is drawn and accepts, before their portrait goes live:

```text
confirmed email or Apple account
explicit invitation acceptance
completed guided portrait
human moderation approval
```

Beta does **not** collect biometric data or claim automated liveness. A
moderator reviews the submitted portrait and guided answers before publication.
If identity abuse appears in beta, publication pauses while the case is
reviewed; an SDK must not be added merely to preserve an earlier promise.

Liveness can be reconsidered only as a separately designed feature with an
explicit processor, consent, retention/deletion guarantees, accessibility
fallbacks, and a new policy amendment. The dormant database switch and write
RPC were removed in migration `20260823230000_release_assurance.sql` so code and
public promises cannot silently drift apart.

## One person, one account

The hardest problem here, and the one this policy does **not** solve. Nothing
above prevents someone holding several accounts and multiplying their chances.

Mitigations available without changing the principle:

1. Email confirmation makes each account cost a distinct address.
2. Seven-day age makes stockpiling slow and visible.
3. Article 5.4 removes anyone published from every future pool, so the payoff
   for holding many accounts is capped at one appearance each.
4. Device signals can be turned on for new accounts if abuse is observed.

An honest statement of where that leaves us: a determined person can improve
their odds from 1-in-N to k-in-N with k accounts. At the scale where that
matters, so does the sustained cost of maintaining them, and at that point the
signals in (4) become proportionate. Pretending this is solved would be worse
than saying it is not.

## How the levels map

| `verification_level` | Meaning | Grants |
| --- | --- | --- |
| `none` | Account exists, address unconfirmed | Read, ask, vote, Remember |
| `email` | Email confirmed, or signed in with Apple | The above, plus the pool after 7 days |
| `device` | Device signals checked | Reserved; abuse response |
| `phone` | Phone confirmed | Reserved; abuse response |
| `liveness` | Legacy/reserved value; not assigned by the beta product | None |

Levels are set by the system only. No client role can write
`verification_level` — see `docs/DATABASE.md`.
