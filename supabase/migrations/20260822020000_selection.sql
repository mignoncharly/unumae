-- Phase 4 — eligibility and the daily selection engine
--
-- This is the migration the whole product rests on. Article 5 is the reason
-- ONE HUMAN deserves to exist, and it is also the article most likely to be
-- quietly eroded, so as much of it as possible is expressed as schema rather
-- than as convention.
--
-- The draw must be reconstructable by anyone holding the frozen pool and the
-- recorded seed. `order by random()` is therefore forbidden: the ordering is a
-- deterministic HMAC of each candidate id under that seed.

-- ---------------------------------------------------------------------------
-- 1. Leaving the pool is the user's decision; being in it is not
-- ---------------------------------------------------------------------------
--
-- Article 5.6 lets a user leave the draw at any time and re-enter later, but
-- Phase 3 made selection_eligible unwritable by users, which would have made
-- that impossible. Two flags, two owners:
--
--   wants_selection    the user's choice        (user writable)
--   selection_eligible the system's judgement   (service role only)
--
-- The pool needs both. Leaving costs nothing and grants nothing.

alter table public.profiles
  add column wants_selection boolean not null default true;

comment on column public.profiles.wants_selection is
  'The user opting in or out of the draw (Article 5.6). User writable.';

grant update (wants_selection) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. The cycle state machine (Article 4.3)
-- ---------------------------------------------------------------------------

create type public.selection_status as enum (
  'scheduled',
  'selected',
  'awaiting_acceptance',
  'accepted',
  'content_review',
  'ready',
  'live',
  'completed',
  'cancelled',
  'replacement_required'
);

-- ---------------------------------------------------------------------------
-- 3. The audit record
-- ---------------------------------------------------------------------------

create table public.daily_draws (
  id uuid primary key default extensions.gen_random_uuid(),

  -- One human per cycle, enforced by the schema and not by a code path.
  selection_date date not null,
  draw_version integer not null default 1,

  -- Recorded before the draw and never modified afterwards.
  candidate_pool_hash text not null,
  candidate_count integer not null,
  random_seed text not null,

  selected_user_id uuid references public.profiles (id) on delete set null,
  backup_1 uuid references public.profiles (id) on delete set null,
  backup_2 uuid references public.profiles (id) on delete set null,
  backup_3 uuid references public.profiles (id) on delete set null,

  selection_status public.selection_status not null default 'scheduled',

  created_at timestamptz not null default now(),
  published_at timestamptz,

  constraint daily_draws_unique_version unique (selection_date, draw_version),
  constraint daily_draws_pool_not_empty check (candidate_count >= 0),
  constraint daily_draws_seed_length check (char_length(random_seed) >= 32)
);

comment on table public.daily_draws is
  'Permanent, auditable record of every draw. Never deleted, even when cancelled (Article 5.2).';

-- Exactly one active draw per date. An emergency re-draw supersedes the
-- previous row rather than editing it, so history stays intact (Article 5.5).
create unique index idx_daily_draws_active_cycle
  on public.daily_draws (selection_date)
  where selection_status <> 'cancelled';

create index idx_daily_draws_date on public.daily_draws (selection_date desc);
create index idx_daily_draws_selected on public.daily_draws (selected_user_id);

-- The frozen pool. Without it the recorded hash proves nothing, because there
-- would be no way to show which membership produced it.
create table public.draw_candidates (
  draw_id uuid not null references public.daily_draws (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (draw_id, user_id)
);

comment on table public.draw_candidates is
  'Membership of a frozen candidate pool. Private: who entered a draw is nobody else''s business.';

alter table public.daily_draws enable row level security;
alter table public.draw_candidates enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Eligibility (Article 5.1) — binary, never a score
-- ---------------------------------------------------------------------------
--
-- There is no eligibility score, no tier and no "more eligible". A profile is
-- in the pool or it is not, and every profile in the pool has exactly the same
-- probability.
--
-- Note what is NOT here: activity, engagement, payment, follower counts,
-- country quotas, content quality. Article 5.3 forbids them as inputs, and the
-- simplest way to keep them out is to have nowhere to put them.

create or replace function public.is_eligible(candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.account_status = 'active'
    and p.wants_selection = true
    and p.selection_eligible = true
    and p.accepted_rules_at is not null
    and p.verification_level <> 'none'
    and p.birth_year <= (extract(year from now())::integer - 16)
    -- Article 5.4: one human, one day, forever. No cooldown, no second turn.
    and not exists (
      select 1
      from public.daily_draws d
      where d.selected_user_id = p.id
    )
  from public.profiles p
  where p.id = candidate_id;
$$;

-- ---------------------------------------------------------------------------
-- 5. The draw itself — deterministic, and verifiable by anyone
-- ---------------------------------------------------------------------------
--
-- rank(candidate) = HMAC-SHA256(candidate_id, seed)
--
-- Ordering by that rank is a uniform random permutation of the pool for an
-- unpredictable seed, and it is reproducible: given the frozen pool and the
-- published seed, anyone can recompute the winner and check our answer. Ties
-- break on user_id so the result is total even in the impossible case.

create or replace function public.draw_rank(seed text, candidate uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.hmac(candidate::text, seed, 'sha256'),
    'hex'
  );
$$;

comment on function public.draw_rank is
  'Deterministic rank of one candidate under one seed. Public so the draw can be verified (Article 12).';

create or replace function public.draw_order(seed text, ids uuid[])
returns uuid[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(id order by public.draw_rank(seed, id), id), '{}'::uuid[])
  from unnest(ids) as id;
$$;

comment on function public.draw_order is
  'The full ordering the draw produces. Anyone can call this to check a published result.';

-- ---------------------------------------------------------------------------
-- 6. Freezing the pool and drawing (Article 5.2)
-- ---------------------------------------------------------------------------

create or replace function public.run_daily_draw(target_date date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_draw_id uuid;
  pool uuid[];
  pool_hash text;
  seed text;
  ordered uuid[];
  next_version integer;
begin
  if exists (
    select 1 from public.daily_draws
    where selection_date = target_date
      and selection_status <> 'cancelled'
  ) then
    raise exception 'A draw already exists for %', target_date
      using errcode = 'unique_violation';
  end if;

  -- Freeze. Ordering by id makes the hash depend on membership only, never on
  -- the order rows happened to come back in.
  select coalesce(array_agg(p.id order by p.id), '{}'::uuid[])
  into pool
  from public.profiles p
  where public.is_eligible(p.id);

  pool_hash := encode(
    extensions.digest(array_to_string(pool, ','), 'sha256'),
    'hex'
  );

  -- Cryptographically secure, not random(). 32 bytes.
  seed := encode(extensions.gen_random_bytes(32), 'hex');

  ordered := public.draw_order(seed, pool);

  select coalesce(max(draw_version), 0) + 1
  into next_version
  from public.daily_draws
  where selection_date = target_date;

  insert into public.daily_draws (
    selection_date,
    draw_version,
    candidate_pool_hash,
    candidate_count,
    random_seed,
    selected_user_id,
    backup_1,
    backup_2,
    backup_3,
    selection_status
  ) values (
    target_date,
    next_version,
    pool_hash,
    coalesce(array_length(pool, 1), 0),
    seed,
    ordered[1],
    ordered[2],
    ordered[3],
    ordered[4],
    -- An empty pool is a Quiet Day waiting to happen, recorded honestly
    -- rather than hidden (Article 5.8).
    case when ordered[1] is null then 'cancelled' else 'selected' end
  )
  returning id into new_draw_id;

  insert into public.draw_candidates (draw_id, user_id)
  select new_draw_id, unnest(pool);

  return new_draw_id;
end;
$$;

comment on function public.run_daily_draw is
  'Freezes the pool, records hash and seed, then draws primary + 3 backups (Article 5.2).';

-- ---------------------------------------------------------------------------
-- 7. Escalation (Article 5.5)
-- ---------------------------------------------------------------------------
--
-- primary → backup 1 → backup 2 → backup 3 → emergency re-draw.
--
-- Silence carries no penalty: a candidate who never answers is not banned and
-- not deprioritised. They simply stay in future pools.

create or replace function public.escalate_draw(target_date date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_draw public.daily_draws;
  next_candidate uuid;
begin
  select * into current_draw
  from public.daily_draws
  where selection_date = target_date
    and selection_status <> 'cancelled'
  order by draw_version desc
  limit 1;

  if not found then
    raise exception 'No draw for %', target_date using errcode = 'no_data_found';
  end if;

  -- Shift the queue up by one. The declined or silent candidate is simply
  -- dropped from this cycle.
  next_candidate := current_draw.backup_1;

  if next_candidate is null then
    -- Everyone contacted has passed. Supersede this draw rather than editing
    -- it, so the record of what happened survives.
    update public.daily_draws
    set selection_status = 'cancelled'
    where id = current_draw.id;

    return public.run_daily_draw(target_date);
  end if;

  update public.daily_draws
  set selected_user_id = next_candidate,
      backup_1 = current_draw.backup_2,
      backup_2 = current_draw.backup_3,
      backup_3 = null,
      selection_status = 'selected'
  where id = current_draw.id;

  return current_draw.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Privileges
-- ---------------------------------------------------------------------------

revoke all on public.daily_draws from anon, authenticated;
revoke all on public.draw_candidates from anon, authenticated;

-- Article 12: the product must be able to explain why a person was selected.
-- These six columns are the explanation. The identities are not part of it,
-- and neither anon nor authenticated is granted them.
grant select (
  selection_date,
  draw_version,
  candidate_pool_hash,
  candidate_count,
  random_seed,
  selection_status,
  published_at
) on public.daily_draws to anon, authenticated;

-- Only draws that have gone live are visible. A pending draw would leak
-- tomorrow's human to anyone who could recompute the ordering.
create policy daily_draws_select_published
  on public.daily_draws for select
  to anon, authenticated
  using (selection_status in ('live', 'completed'));

-- No policy on draw_candidates at all: who entered a draw is private, and the
-- service role does not consult policies.

revoke execute on function public.run_daily_draw(date) from anon, authenticated;
revoke execute on function public.escalate_draw(date) from anon, authenticated;
revoke execute on function public.is_eligible(uuid) from anon;

-- The verification functions are deliberately public: a fairness claim nobody
-- can check is just a claim.
grant execute on function public.draw_rank(text, uuid) to anon, authenticated;
grant execute on function public.draw_order(text, uuid[]) to anon, authenticated;
grant execute on function public.is_eligible(uuid) to authenticated;
