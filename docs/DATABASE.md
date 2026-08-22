# Database

Postgres via Supabase. Conventions here are enforced by
`scripts/verify-migrations.mjs` and `tests/schema-guard.test.ts`, not by
goodwill.

## Non-negotiable schema rules

### 1. Forbidden columns (Article 7.2)

```text
followers   following   popularity_score
likes_received   engagement_score   reach
```

A migration containing any of these fails `npm run verify`. The refusal is
enforced mechanically because the pressure to add them will arrive years after
the person who wrote the constitution has stopped reviewing every PR.

### 2. Row Level Security is mandatory

Every `create table` must be accompanied, in the same migration, by:

```sql
alter table public.<name> enable row level security;
```

A table without RLS is a security bug, not a shortcut — the anon key is public
by design and RLS is the only thing standing behind it.

### 3. Migrations are append-only

Named `<14-digit timestamp>_<snake_case>.sql`, strictly increasing. Once a
migration has been applied to any environment it is never edited; the fix is a
new migration. The verifier warns when an older file is modified after a newer
one exists.

## Naming conventions

| Thing | Convention | Example |
| --- | --- | --- |
| Table | plural, snake_case | `daily_draws` |
| Column | snake_case | `selected_user_id` |
| Primary key | `id uuid default gen_random_uuid()` | |
| Timestamps | `timestamptz`, **always UTC** | `published_at` |
| Cycle date | `date`, a UTC calendar date | `selection_date` |
| Enum | singular, snake_case | `selection_status` |
| Index | `idx_<table>_<columns>` | `idx_daily_draws_selection_date` |

`timestamptz` everywhere, never `timestamp`. Article 4 has one global clock and
the database is not the place to lose it.

## 4. Column-level GRANTs, not just RLS

RLS decides **which rows** you touch. GRANTs decide **which columns**. Both are
required, and forgetting the second is how a user makes themselves eligible.

The pattern every table follows:

```sql
revoke all on public.<table> from anon, authenticated;
grant select on public.<table> to authenticated;
grant insert (<only the columns a user may set>) on public.<table> to authenticated;
grant update (<only the columns a user may change>) on public.<table> to authenticated;
```

## Shipped schema

### Phase 3 — profiles ✅

`public.profiles`, deliberately minimal (Article 6.2 and 7.2).

```text
id                  uuid primary key, references auth.users on delete cascade
username            citext unique, ^[a-z0-9_]{3,20}$
display_name        text, 1–40 chars
birth_year          integer          -- age gate, not a birthday feature
country_code        char(2)          -- country is sufficient (Article 8.2)
city                text null        -- optional, hideable, never required
languages           text[]           -- max 10
avatar_path         text null
bio_short           text null        -- max 160
selection_eligible  boolean          -- service role only
verification_level  verification_level enum  -- service role only
account_status      account_status enum      -- service role only
accepted_rules_at   timestamptz null         -- service role only
created_at          timestamptz
updated_at          timestamptz      -- maintained by trigger
```

**Privileges.** `authenticated` may insert nine columns and update seven.
`birth_year` is insertable but **not updatable** — an age gate you can edit
afterwards is not a gate. `selection_eligible`, `verification_level`,
`account_status` and `accepted_rules_at` appear in neither grant: a user cannot
make themselves eligible, verified, or unbanned. `anon` is granted nothing at
all.

**The age gate is a trigger, not a CHECK.** `extract(year from now())` is not an
immutable expression, so Postgres rejects it in a constraint.
`profiles_enforce_min_age` raises on insert and on any update of `birth_year`.

**Policies.** Select, insert and update, all scoped to `auth.uid() = id`. There
is no delete policy: deletion cascades from `auth.users`, so a profile is never
orphaned and a user cannot delete the row while keeping the account.

`tests/profile-privileges.test.ts` asserts all of the above by reading the
migration, so a future migration that widens a grant fails `npm run verify`.

## Planned schema, by phase

Nothing below exists yet. It is recorded here so the shape is agreed before the
first table is written.

### Phase 4 — eligibility and the draw

`daily_draws` — the audit record that makes fairness verifiable. Never deleted,
even when a cycle is cancelled.

```text
id                  uuid primary key
selection_date      date unique      -- one human per cycle (Article 1.6)
draw_version        integer          -- incremented by an emergency re-draw
candidate_pool_hash text             -- recorded before the draw
candidate_count     integer
selected_user_id    uuid null
backup_1            uuid null
backup_2            uuid null
backup_3            uuid null
random_seed         text             -- CSPRNG, recorded before the draw
selection_status    selection_status
created_at          timestamptz
published_at        timestamptz null
```

`selection_status`:

```text
scheduled · selected · awaiting_acceptance · accepted · content_review
ready · live · completed · cancelled · replacement_required
```

The draw must be reconstructable from `candidate_pool_hash` + `random_seed`.
`order by random() limit 1` is forbidden as a selection mechanism (Article 5.2).

### Phase 7 — the daily loop

```text
portraits         one per cycle, elements as structured fields not free text
questions         max 180 characters (Article 9.2)
question_votes    unique(question_id, user_id) — upvote only (Article 9.3)
remembers         private library; the count is never exposed (Article 9.4)
```

### Phase 9 — trust and safety

```text
content_reports   moderation_events   moderation_decisions
user_blocks       account_flags
```

## RLS posture

Default deny. Policies are written per table and reviewed as security changes.

| Data | Anonymous | Authenticated | Owner | Admin |
| --- | --- | --- | --- | --- |
| Live portrait, archived humans | read | read | — | all |
| Approved questions and answers | read | read | — | all |
| Own profile | — | — | read/write | all |
| Other profiles | — | minimal public fields | — | all |
| `question_votes` | — | insert own, delete own | — | all |
| `remembers` | — | own rows only | own | all |
| `daily_draws` | — | — | — | read only |
| Moderation tables | — | — | — | all |

Nobody but the service role writes `daily_draws`. Not admins through the client,
not the selected user. The audit trail is only worth something if the
application cannot rewrite it.

## Local development

```bash
npx supabase start        # local stack
npx supabase db reset     # re-apply migrations + seed.sql
npx supabase gen types typescript --local > src/lib/supabase/types.ts
```

`supabase/seed.sql` never contains real people and never runs against staging or
production.
