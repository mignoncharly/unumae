-- Phase 16 — the instruments for running this at ten thousand people.
--
-- Every function here is a *monitor*. None of them is an input to anything.
--
-- That distinction is the whole of this migration. At scale the tempting move
-- is to let the numbers steer the product: balance the draw by country, weight
-- against suspicious accounts, notify the people who have gone quiet. Each of
-- those would be a defensible engineering decision and each would break
-- something the product has promised in writing.
--
--   Article 5.2 — the draw takes eligibility and chance. Nothing else.
--   Article 5.5 — declining costs you nothing.
--   Phase 10   — four notification categories exist, and no more.
--
-- So these look at the product and report. A moderator reads them and decides
-- what to do as a human being. Nothing here closes a loop automatically, and
-- tests/scale-schema.test.ts fails the build if the draw ever learns any of it.

-- ---------------------------------------------------------------------------
-- 1. Country balance — watched, never corrected
-- ---------------------------------------------------------------------------
--
-- The question this answers: is the Archive drifting away from the pool?
--
-- If Cameroon is 8% of the people waiting and 1% of the people published, that
-- is worth knowing. It could mean bad luck, which at these numbers is very
-- likely. It could also mean something is wrong upstream — invitations not
-- arriving, a moderation bias, a timezone making the acceptance window fall at
-- 3am for a whole country. All three are worth a human looking.
--
-- What it must never become is a correction. A draw that balanced by country
-- would be a draw with an input other than chance, and the answer to "why was
-- this person selected?" would stop being "the draw, and here is the seed".

create or replace function public.country_balance()
returns table (
  country_code char(2),
  waiting integer,
  pool_share numeric,
  published integer,
  archive_share numeric,
  drift numeric
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
  with pool as (
    select p.country_code
    from public.profiles p
    where public.is_eligible(p.id)
  ),
  pool_total as (select count(*)::numeric as n from pool),
  archive as (
    select pr.country_code
    from public.daily_draws d
    join public.profiles pr on pr.id = d.selected_user_id
    where d.human_number is not null
  ),
  archive_total as (select count(*)::numeric as n from archive),
  by_country as (
    select
      coalesce(a.country_code, b.country_code) as code,
      coalesce(a.n, 0) as waiting_n,
      coalesce(b.n, 0) as published_n
    from (select country_code, count(*)::integer as n from pool group by 1) a
    full outer join
      (select country_code, count(*)::integer as n from archive group by 1) b
      on a.country_code = b.country_code
  )
  select
    c.code,
    c.waiting_n,
    case when (select n from pool_total) = 0 then 0
         else round(c.waiting_n * 100 / (select n from pool_total), 1) end,
    c.published_n,
    case when (select n from archive_total) = 0 then 0
         else round(c.published_n * 100 / (select n from archive_total), 1) end,
    -- Archive share minus pool share. Negative means under-represented so far.
    -- With a small Archive this is mostly noise, and reading it as a problem
    -- before there are a few hundred cycles would be reading tea leaves.
    case
      when (select n from pool_total) = 0 or (select n from archive_total) = 0
        then 0
      else round(
        c.published_n * 100 / (select n from archive_total)
        - c.waiting_n * 100 / (select n from pool_total), 1)
    end
  from by_country c
  order by c.waiting_n desc, c.code;
end;
$$;

comment on function public.country_balance is
  'Pool share against Archive share. A monitor. Never an input to the draw.';

-- ---------------------------------------------------------------------------
-- 2. Integrity signals — the honest version of anti-fraud
-- ---------------------------------------------------------------------------
--
-- The fraud that matters here is one person holding many accounts to improve
-- their odds. It is the only cheating this product has a motive for, because
-- there is nothing else to win.
--
-- The usual answer is device fingerprinting, and this schema cannot do it:
-- analytics_events has no IP address, no device model, no advertising
-- identifier, and tests/analytics-schema.test.ts asserts those columns do not
-- exist. That was a deliberate choice made in Phase 11 and this is the bill for
-- it — arriving, as expected, and worth paying.
--
-- So what is left is weaker and honest: patterns visible in data we already
-- keep for other reasons. It catches the careless and not the determined. The
-- real defence against a determined multi-accounter is raising
-- verification_level, which is a product decision with a real cost to real
-- users, and it should be made deliberately rather than drifted into.

create or replace function public.integrity_signals(window_days integer default 7)
returns table (
  signal text,
  count integer,
  detail text
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
    select now() - make_interval(days => window_days) as since
  ),
  -- Accounts created within a minute of each other. Ordinary signup does not
  -- cluster like this; a script does.
  bursts as (
    select count(*)::integer as n
    from (
      select p.id,
        lag(p.created_at) over (order by p.created_at) as previous
      from public.profiles p, span
      where p.created_at >= span.since
    ) ordered
    where ordered.previous is not null
      and ordered.previous > (
        select p2.created_at from public.profiles p2 where p2.id = ordered.id
      ) - interval '1 minute'
  ),
  -- Accepted a cycle and never submitted anything. Costs a day, and the cycle
  -- has to be rescued by escalation.
  abandoned as (
    select count(*)::integer as n
    from public.daily_draws d
    left join public.portraits po
      on po.draw_id = d.id and po.status <> 'draft'
    where d.selection_status = 'accepted'
      and po.id is null
      and d.selection_date < (now() at time zone 'utc')::date
  ),
  -- The pool's verification mix. If almost everyone is email-only, the pool is
  -- as trustworthy as an email address is, which is not very.
  weakly_verified as (
    select count(*)::integer as n
    from public.profiles p
    where public.is_eligible(p.id)
      and p.verification_level = 'email'
  ),
  pool as (
    select count(*)::integer as n
    from public.profiles p
    where public.is_eligible(p.id)
  ),
  -- Several accounts claiming the same country and birth year is not proof of
  -- anything on its own — with ten thousand people it is arithmetic. It is
  -- listed because combined with a burst it stops being a coincidence.
  collisions as (
    select coalesce(sum(c.n - 1), 0)::integer as n
    from (
      select count(*)::integer as n
      from public.profiles p, span
      where p.created_at >= span.since
      group by p.country_code, p.birth_year
      having count(*) > 1
    ) c
  )
  select 'signup_bursts', (select n from bursts),
         'accounts created within a minute of another'
  union all
  select 'abandoned_cycles', (select n from abandoned),
         'accepted and never submitted — each one cost a cycle'
  union all
  select 'email_only_pool', (select n from weakly_verified),
         'of ' || (select n from pool)::text || ' waiting, verified by email alone'
  union all
  select 'country_year_collisions', (select n from collisions),
         'same country and birth year — only meaningful alongside a burst';
end;
$$;

comment on function public.integrity_signals is
  'Weak, honest fraud signals from data already kept. Never feeds eligibility.';

-- ---------------------------------------------------------------------------
-- 3. Moderation health
-- ---------------------------------------------------------------------------
--
-- A portrait waiting on review is holding up a cycle, and unlike everything
-- else that can go wrong here, nobody is told. The selected person sees
-- "submitted" and waits. So the number that matters is not how many are in the
-- queue but how long the oldest one has been there.

create or replace function public.moderation_health()
returns table (
  measure text,
  value integer,
  detail text
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
  select 'portraits_waiting',
         (select count(*)::integer from public.portraits
          where status in ('submitted', 'in_review')),
         'a portrait waiting is a cycle waiting'
  union all
  select 'oldest_portrait_hours',
         coalesce((
           select floor(extract(epoch from now() - min(submitted_at)) / 3600)::integer
           from public.portraits where status in ('submitted', 'in_review')
         ), 0),
         'hours the oldest submission has been waiting'
  union all
  select 'questions_waiting',
         (select count(*)::integer from public.questions where status = 'pending'),
         'unreviewed questions on live cycles'
  union all
  select 'oldest_question_hours',
         coalesce((
           select floor(extract(epoch from now() - min(created_at)) / 3600)::integer
           from public.questions where status = 'pending'
         ), 0),
         'a question reviewed after their day ends was never asked'
  union all
  select 'reports_open',
         (select count(*)::integer from public.content_reports where status = 'open'),
         'unresolved reports'
  union all
  select 'cycles_at_risk',
         (select count(*)::integer from public.daily_draws
          where selection_date >= (now() at time zone 'utc')::date
            and selection_status in (
              'selected', 'awaiting_acceptance', 'replacement_required'
            )),
         'upcoming cycles without an approved portrait yet';
end;
$$;

comment on function public.moderation_health is
  'Queue ages, not queue sizes. The oldest item is the one costing somebody a day.';

-- ---------------------------------------------------------------------------
-- 4. Privileges
-- ---------------------------------------------------------------------------

revoke execute on function public.country_balance() from public, anon;
revoke execute on function public.integrity_signals(integer) from public, anon;
revoke execute on function public.moderation_health() from public, anon;

grant execute on function public.country_balance() to authenticated;
grant execute on function public.integrity_signals(integer) to authenticated;
grant execute on function public.moderation_health() to authenticated;
