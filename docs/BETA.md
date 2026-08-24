# Internal Alpha, Private Beta, and the decision to grow

Phase 14. Three questions in order, and no shortcuts between them:

1. Does the loop work at all?
2. Does it work with real strangers in it?
3. Do they come back?

Only the third one decides whether any money is ever spent on users.

---

## 1. Internal Alpha — does the loop work?

10–20 people, no real draw, several days compressed into a few minutes.

```bash
npm run simulate
```

`scripts/simulate-cycle.mjs` creates 12 throwaway candidates, backdates them so
they are eligible, runs two full cycles, exercises the audience, checks the
Archive, and deletes everything it made — including rewinding the human number
sequence, so the first real Human is still #1.

It runs against the live project. That is deliberate: a simulation against a
different database proves the simulation works.

### What it found

Two bugs that every one of the 481 offline tests missed, both fatal, both
silent:

| Bug | Effect | Fix |
| --- | --- | --- |
| `run_daily_draw` cast a `CASE` result to an enum | The nightly draw raised an exception. Every night. Since Phase 4. | `20260823050000_fix_draw_cast.sql` |
| Four moderation functions did the same | Nothing could be approved, so no cycle could ever go live | `20260823060000_fix_moderation_casts.sql` |

Together they meant the product's entire pipeline had never once worked
end to end, while the test suite was green throughout.

The reason is worth writing down, because it applies to every guard in this
repository: **the schema tests read the migrations as text.** They check what
the SQL says. They cannot check that it runs. That is a real limit, not a
temporary gap, and this script is the answer to it. Anything that only executes
on a three-day cycle needs a way to be executed in three minutes, or nobody
will find out it is broken until it matters.

Run it after any migration that touches the draw, the moderation path, or
publication.

### The questions the alpha is actually for

The script proves the machinery. It cannot answer these, and they need real
people using it for a week:

- Is Today's Human interesting?
- Do the questions make you want to ask one?
- Does anyone open the Archive?
- Does anyone share a portrait without being asked to?

If the answer to the last two is no, the product is a feed with one item, and
no amount of growth spending fixes that.

---

## 2. Private Beta — the First 100

**Target: 100 active people, not 10,000 downloads.** The draw becomes real: one
person a day, and at 100 people that is a 1-in-100 chance. That is an
extraordinary number, and it is the strongest thing this product has while it is
small. It gets worse as the product succeeds, which is worth being honest about
now rather than being surprised by later.

### Founding Humans

Everyone who joins during Year Zero is a Founding Human — "Joined during Year
Zero."

**It carries no advantage in the draw, and it cannot be made to.** That is
structural, not a promise:

- There is no `is_founding` column. Nothing exists to award, revoke, or weigh.
- It is derived from two facts that already exist — when the account was
  created, and when the Archive started (`joined_in_year_zero`).
- `is_eligible`, `draw_order` and `run_daily_draw` have never heard of it, and
  `tests/retention-schema.test.ts` fails the build if that changes.
- `am_i_founding()` takes no argument, so the badge cannot be used to fish for
  anyone else's join date.

Year Zero is the first 365 days of the Archive, counted from the first published
cycle rather than from a date typed into a file. Before launch, everyone who has
joined is inside it — which is right; they are the earliest arrivals.

Where it appears: under the name on Today and on a Human's Archive page, in the
quietest type on the screen, and on your own settings screen with the sentence
that keeps it honest. It is never in the Archive list, where a column of badges
would turn a history into a leaderboard.

---

## 3. Retention validation — the gate

Measured in the moderator console, **Signals** tab, or directly:

```sql
select * from public.growth_gate();        -- the four checks
select * from public.retention_cohorts();  -- D1/D7 by join-day cohort
select * from public.participation_mix();  -- take part vs watch only
select * from public.analytics_journey_funnels(); -- four core journeys
select * from public.analytics_notification_attribution(); -- open source/action
```

All five are moderator-only, enforced inside each function.

### The four checks

| Check | Threshold | The question |
| --- | --- | --- |
| `d1_retention` | 25% | Did they come back to see the next Human? |
| `d7_retention` | 10% | Are they still here a week later? |
| `participation` | 15% | Do they take part, or only watch? |
| `share_rate` | 3% | Is a portrait worth opening the share sheet for? |

The thresholds live in `src/constants/retention.ts` **and** in
`20260823070000_founding_and_retention.sql`, and a test asserts they are equal.
Moving one means moving both, deliberately, in a commit that says why.

### The rule

> **If D1 is bad, we buy no users. We fix the product.**

The thresholds were written down before any result existed. That is the only
thing that makes them worth anything — a threshold you choose after seeing the
number is not a threshold, it is a justification.

Four checks rather than one because D1 alone can be bought with a notification.
A product people return to but never take part in and never share is a product
with a ceiling, and the ceiling is cheaper to discover now than after a
campaign.

### Two honesty rules built into the numbers

**Immature cohorts report `null`, never `0`.** A cohort that arrived yesterday
has not failed D7; it has not reached it. Reporting zero would drag every
average down, make a healthy product look dead, and — worse — make the gate
answerable by waiting instead of by improving.

**The gate weights by cohort size.** It divides total returners by total
installs across matured cohorts, so a three-person cohort where one lucky person
came back cannot swing a decision that costs money.

### What is deliberately not measured

No DAU, no MAU, no session length, no time-in-app. `analytics_kpis` reports
activation, curiosity, engagement, memory and sharing instead. The database has
nowhere to put an IP address, a device model, an advertising identifier or a
location — `tests/analytics-schema.test.ts` asserts those columns do not exist,
so this is a property of the schema rather than a policy anyone has to keep.

Retention here means "did they come back to meet a person", which is the thing
the product is for. It does not mean "how long did we hold their attention",
which is the thing it is built to avoid.

---

## Order of operations

1. `npm run simulate` — green, every time, after any migration touching the loop.
2. Internal alpha with 10–20 people you know. Watch, do not survey.
3. Private beta to 100. The draw is real from here.
4. Let four weeks pass. `growth_gate()` reads 28 days for a reason.
5. Read the gate. If it does not pass, fix the product and wait another four
   weeks. Do not buy a single user.

Phase 15 — the viral experiments — starts at step 5, and only if the gate is
open.
