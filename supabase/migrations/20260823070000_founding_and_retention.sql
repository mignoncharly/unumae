-- Phase 14 — Founding Humans, and the numbers that decide whether we grow.
--
-- Two things the plan asks for before any money is spent on users:
--
--   1. A "Founding Humans" badge — "Joined during Year Zero" — explicitly
--      *without* any selection advantage.
--   2. D1 and D7 retention, participation and share rate, so that a bad D1
--      stops a campaign instead of being explained away after it.

-- ---------------------------------------------------------------------------
-- 1. Year Zero
-- ---------------------------------------------------------------------------
--
-- The badge is not a column. That is the whole design.
--
-- There is no `is_founding` field to set, so there is nothing to award, revoke,
-- sell, or accidentally include in the draw. It is derived from the two facts
-- that already exist: when the account was created, and when the Archive
-- started. Nobody can be given it and nobody can lose it.
--
-- Year Zero is the first 365 days of the Archive, counted from the first
-- published cycle rather than from a date typed into a file — the product's own
-- history defines it. Before the first cycle publishes, everyone who has joined
-- is inside it, which is exactly right: they are the earliest arrivals.

create or replace function public.year_zero_ends()
returns date
language sql
stable
security definer
set search_path = ''
as $$
  -- Inclusive last day: day one plus 364.
  select min(selection_date) + 364
  from public.daily_draws
  where human_number is not null;
$$;

comment on function public.year_zero_ends is
  'Last day of Year Zero: 365 days from the first published cycle. Null before launch.';

create or replace function public.joined_in_year_zero(joined timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when joined is null then false
    when public.year_zero_ends() is null then true
    else (joined at time zone 'utc')::date <= public.year_zero_ends()
  end;
$$;

/*
 * Am I a Founding Human?
 *
 * For the account screen. It reads one row — your own — and cannot be asked
 * about anybody else, so the badge cannot be used to enumerate join dates.
 */
create or replace function public.am_i_founding()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.joined_in_year_zero(p.created_at)
  from public.profiles p
  where p.id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 2. The badge on the reader surfaces
-- ---------------------------------------------------------------------------
--
-- Shown where the person is — Today, and their page in the Archive — and not
-- in the Archive list, where a row of badges would turn a history into a
-- leaderboard.
--
-- `create or replace` cannot change a return type, so both are dropped and
-- recreated, and their grants restored at the bottom. Same dance as
-- 20260822160000.

drop function if exists public.get_todays_human();
drop function if exists public.get_human(uuid);

create or replace function public.get_todays_human()
returns table (
  draw_id uuid,
  portrait_id uuid,
  selection_date date,
  human_number integer,
  display_name text,
  country_code char(2),
  city text,
  photo_path text,
  published_at timestamptz,
  founding boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    po.id,
    d.selection_date,
    d.human_number,
    pr.display_name,
    pr.country_code,
    case when pr.city_hidden then null else pr.city end,
    po.photo_path,
    d.published_at,
    public.joined_in_year_zero(pr.created_at)
  from public.daily_draws d
  join public.profiles pr on pr.id = d.selected_user_id
  join public.portraits po on po.draw_id = d.id
  where d.selection_status = 'live'
    and po.status = 'approved'
  order by d.selection_date desc
  limit 1;
$$;

create or replace function public.get_human(target_draw uuid)
returns table (
  draw_id uuid,
  portrait_id uuid,
  selection_date date,
  human_number integer,
  display_name text,
  country_code char(2),
  city text,
  photo_path text,
  published_at timestamptz,
  is_removed boolean,
  founding boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    po.id,
    d.selection_date,
    d.human_number,
    pr.display_name,
    pr.country_code,
    case when pr.city_hidden then null else pr.city end,
    po.photo_path,
    d.published_at,
    (d.selected_user_id is null) as is_removed,
    -- A removed account has no created_at to read, so no badge. Correct: the
    -- cycle stays in the Archive, the person does not.
    public.joined_in_year_zero(pr.created_at)
  from public.daily_draws d
  left join public.profiles pr on pr.id = d.selected_user_id
  left join public.portraits po
    on po.draw_id = d.id and po.status = 'approved'
  where d.id = target_draw
    and d.selection_status in ('live', 'completed')
    and d.human_number is not null;
$$;

-- ---------------------------------------------------------------------------
-- 3. Cohort retention
-- ---------------------------------------------------------------------------
--
-- analytics_kpis already reports "curiosity" — the share of installs that came
-- back on any next day. That is a pooled number and it flatters: one install
-- returning on ten consecutive days lifts it. This is the cohort version, which
-- is the one a growth decision should rest on.
--
-- A cohort is every install first seen on the same UTC day. D1 is that cohort
-- coming back on day+1, D7 on day+7 — the day the next Human, and the seventh
-- Human after them, is published.
--
-- Cohorts too young to have had their chance report null, not zero. Yesterday's
-- cohort has not failed D7; it has not reached it. Counting that as 0% would
-- drag every average down and make a healthy product look dead.

create or replace function public.retention_cohorts(window_days integer default 28)
returns table (
  cohort_date date,
  installs bigint,
  returned_d1 bigint,
  d1_percent numeric,
  returned_d7 bigint,
  d7_percent numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  return query
  with today as (
    select (now() at time zone 'utc')::date as d
  ),
  first_seen as (
    select a.install_id, min(a.occurred_on) as day_zero
    from public.analytics_events a
    group by a.install_id
  ),
  cohort as (
    select f.install_id, f.day_zero
    from first_seen f, today
    where f.day_zero >= today.d - window_days
  ),
  came_back as (
    select
      c.day_zero,
      c.install_id,
      max((a.occurred_on = c.day_zero + 1)::int) as d1,
      max((a.occurred_on = c.day_zero + 7)::int) as d7
    from cohort c
    join public.analytics_events a on a.install_id = c.install_id
    group by c.day_zero, c.install_id
  ),
  rolled as (
    select
      b.day_zero,
      count(*) as installs,
      sum(b.d1) as returned_d1,
      sum(b.d7) as returned_d7
    from came_back b
    group by b.day_zero
  )
  select
    r.day_zero,
    r.installs,
    r.returned_d1,
    case when t.d < r.day_zero + 1 then null
         else round(r.returned_d1::numeric * 100 / r.installs, 1) end,
    r.returned_d7,
    case when t.d < r.day_zero + 7 then null
         else round(r.returned_d7::numeric * 100 / r.installs, 1) end
  from rolled r, today t
  order by r.day_zero desc;
end;
$$;

comment on function public.retention_cohorts is
  'D1 and D7 by join-day cohort. Immature cohorts report null, never zero.';

/*
 * Do they take part, or only watch?
 *
 * Phase 33 asks the question in those words. Watching is a legitimate way to
 * use this product — most of the audience will never be selected and most will
 * never ask anything, and that is fine. The number matters because it tells us
 * whether the questions are worth keeping, not because watchers are a failure.
 */
create or replace function public.participation_mix(window_days integer default 7)
returns table (
  segment text,
  installs bigint,
  percent numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  return query
  with span as (
    select ((now() at time zone 'utc')::date - window_days) as since
  ),
  viewers as (
    select distinct a.install_id
    from public.analytics_events a, span
    where a.event = 'today_viewed' and a.occurred_on >= span.since
  ),
  participants as (
    select distinct a.install_id
    from public.analytics_events a, span
    where a.occurred_on >= span.since
      and a.event in (
        'question_submitted', 'question_voted',
        'human_remembered', 'share_completed'
      )
  ),
  totals as (
    select
      (select count(*) from viewers) as viewed,
      (select count(*) from viewers v
       where v.install_id in (select p.install_id from participants p)) as took_part
  )
  select 'participants'::text, t.took_part,
         case when t.viewed = 0 then 0::numeric
              else round(t.took_part::numeric * 100 / t.viewed, 1) end
  from totals t
  union all
  select 'watchers'::text, t.viewed - t.took_part,
         case when t.viewed = 0 then 0::numeric
              else round((t.viewed - t.took_part)::numeric * 100 / t.viewed, 1) end
  from totals t;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. The gate
-- ---------------------------------------------------------------------------
--
-- The plan is blunt about this: if D1 is bad, we buy no users at all, and we
-- fix the product instead.
--
-- Written down as a function so the decision is made once, in advance, against
-- thresholds chosen before anyone has seen the result. A rule you evaluate
-- after looking at the number is not a rule.
--
-- The thresholds are mirrored in src/constants/retention.ts and asserted equal
-- by tests/retention-schema.test.ts. Moving one means moving both, deliberately.

create or replace function public.growth_gate(window_days integer default 28)
returns table (
  check_name text,
  actual numeric,
  threshold numeric,
  passed boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  d1 numeric;
  d7 numeric;
  took_part numeric;
  shared numeric;
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  -- Weighted across matured cohorts: total returners over total installs, so a
  -- tiny cohort with one lucky return cannot swing the decision.
  select
    round(sum(r.returned_d1) filter (where r.d1_percent is not null)::numeric * 100
          / nullif(sum(r.installs) filter (where r.d1_percent is not null), 0), 1),
    round(sum(r.returned_d7) filter (where r.d7_percent is not null)::numeric * 100
          / nullif(sum(r.installs) filter (where r.d7_percent is not null), 0), 1)
  into d1, d7
  from public.retention_cohorts(window_days) r;

  select m.percent into took_part
  from public.participation_mix(window_days) m
  where m.segment = 'participants';

  with span as (
    select ((now() at time zone 'utc')::date - window_days) as since
  ),
  viewers as (
    select count(distinct a.install_id)::numeric as n
    from public.analytics_events a, span
    where a.event = 'today_viewed' and a.occurred_on >= span.since
  ),
  sharers as (
    select count(distinct a.install_id)::numeric as n
    from public.analytics_events a, span
    where a.event = 'share_completed' and a.occurred_on >= span.since
  )
  select case when v.n = 0 then 0 else round(s.n * 100 / v.n, 1) end
  into shared
  from viewers v, sharers s;

  return query
  select 'd1_retention'::text, coalesce(d1, 0), 25.0::numeric,
         coalesce(d1, 0) >= 25.0
  union all
  select 'd7_retention'::text, coalesce(d7, 0), 10.0::numeric,
         coalesce(d7, 0) >= 10.0
  union all
  select 'participation'::text, coalesce(took_part, 0), 15.0::numeric,
         coalesce(took_part, 0) >= 15.0
  union all
  select 'share_rate'::text, coalesce(shared, 0), 3.0::numeric,
         coalesce(shared, 0) >= 3.0;
end;
$$;

comment on function public.growth_gate is
  'Pre-committed thresholds. All four must pass before buying a single user.';

-- ---------------------------------------------------------------------------
-- 5. Privileges
-- ---------------------------------------------------------------------------

-- Restored after the drops above. Both readers are part of what a guest sees
-- (Article 6.1).
revoke execute on function public.get_todays_human() from public;
revoke execute on function public.get_human(uuid) from public;
grant execute on function public.get_todays_human() to anon, authenticated;
grant execute on function public.get_human(uuid) to anon, authenticated;

-- Derived badge helpers. year_zero_ends is public knowledge — the Archive's
-- first day is on the Archive — but joined_in_year_zero takes a timestamp and
-- must not become an oracle for testing guesses about somebody's join date.
revoke execute on function public.year_zero_ends() from public;
revoke execute on function public.joined_in_year_zero(timestamptz)
  from public, anon, authenticated;
revoke execute on function public.am_i_founding() from public, anon;
grant execute on function public.year_zero_ends() to anon, authenticated;
grant execute on function public.am_i_founding() to authenticated;

-- Moderator-only, enforced inside each function rather than by the grant.
revoke execute on function public.retention_cohorts(integer) from public, anon;
revoke execute on function public.participation_mix(integer) from public, anon;
revoke execute on function public.growth_gate(integer) from public, anon;
grant execute on function public.retention_cohorts(integer) to authenticated;
grant execute on function public.participation_mix(integer) to authenticated;
grant execute on function public.growth_gate(integer) to authenticated;
