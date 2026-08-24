-- Phase 4 — metrics that describe real product behavior.
--
-- Legacy event names remain readable so the 90-day retention window can age
-- out old clients safely. New reporting uses only the corrected definitions.

-- ---------------------------------------------------------------------------
-- Invitation opens are durable journey state, not a repeatable screen event.
-- ---------------------------------------------------------------------------

alter table public.draw_invitations
  add column opened_at timestamptz,
  add column opened_source text,
  add constraint draw_invitations_open_consistent check (
    (opened_at is null and opened_source is null)
    or (opened_at is not null and opened_source in ('screen', 'notification'))
  );

create index idx_draw_invitations_opened
  on public.draw_invitations (opened_at)
  where opened_at is not null;

create or replace function public.mark_invitation_opened(
  target_invitation uuid,
  open_source text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  marked uuid;
begin
  if open_source not in ('screen', 'notification') then
    return false;
  end if;

  update public.draw_invitations i
  set opened_at = coalesce(i.opened_at, now()),
      opened_source = coalesce(i.opened_source, open_source)
  where i.id = target_invitation
    and i.user_id = (select auth.uid())
    and i.response is null
  returning i.id into marked;

  return marked is not null;
end;
$$;

revoke execute on function public.mark_invitation_opened(uuid, text)
  from public, anon;
grant execute on function public.mark_invitation_opened(uuid, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- One active return per installation and UTC day.
-- ---------------------------------------------------------------------------

create unique index idx_analytics_active_day_once
  on public.analytics_events (install_id, occurred_on)
  where event = 'active_day';

create or replace function public.track_events(
  batch_install_id uuid,
  batch jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
  inserted integer;
begin
  if jsonb_typeof(batch) <> 'array' or jsonb_array_length(batch) > 50 then
    return 0;
  end if;

  select count(*) into recent
  from public.analytics_events
  where install_id = batch_install_id
    and created_at > now() - interval '1 minute';

  if recent >= 300 then
    return 0;
  end if;

  insert into public.analytics_events (user_id, install_id, event, properties)
  select
    (select auth.uid()),
    batch_install_id,
    (item ->> 'event')::public.analytics_event,
    coalesce(item -> 'properties', '{}'::jsonb)
  from jsonb_array_elements(batch) as item
  where item ->> 'event' = any (
    select unnest(enum_range(null::public.analytics_event))::text
  )
  on conflict do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- ---------------------------------------------------------------------------
-- Corrected KPIs and retention inputs.
-- ---------------------------------------------------------------------------

create or replace function public.analytics_kpis(window_days integer default 7)
returns table (metric text, value numeric, detail text)
language sql
stable
security definer
set search_path = ''
as $$
  with span as (
    select ((now() at time zone 'utc')::date - greatest(window_days, 1)) as since
  ),
  viewers as (
    select count(distinct install_id)::numeric as n
    from public.analytics_events, span
    where event = 'today_viewed' and occurred_on >= span.since
  ),
  new_installs as (
    select install_id, min(occurred_on) as first_day
    from public.analytics_events
    where event = 'active_day'
    group by install_id
  ),
  returning_installs as (
    select count(*)::numeric as n
    from new_installs first, span
    where first.first_day >= span.since
      and exists (
        select 1 from public.analytics_events returned
        where returned.install_id = first.install_id
          and returned.event = 'active_day'
          and returned.occurred_on = first.first_day + 1
      )
  ),
  first_seen as (
    select count(*)::numeric as n
    from new_installs, span
    where first_day >= span.since
  )
  select 'viewers', (select n from viewers),
         'distinct installs that rendered a Human'
  union all
  select 'curiosity',
         case when (select n from first_seen) = 0 then 0
              else round((select n from returning_installs)
                         / (select n from first_seen) * 100, 1) end,
         'percent active again on the next UTC day'
  union all
  select 'engagement',
         case when (select n from viewers) = 0 then 0
              else round((
                select count(*)::numeric from public.analytics_events, span
                where event = 'question_submitted' and occurred_on >= span.since
              ) / (select n from viewers), 2) end,
         'submitted questions per viewer'
  union all
  select 'memory',
         case when (select n from viewers) = 0 then 0
              else round((
                select count(*)::numeric from public.analytics_events, span
                where event = 'human_remembered' and occurred_on >= span.since
              ) / (select n from viewers), 2) end,
         'Remember additions per viewer'
  union all
  select 'sharing',
         case when (select n from viewers) = 0 then 0
              else round((
                select count(*)::numeric from public.analytics_events, span
                where event = 'share_sheet_opened' and occurred_on >= span.since
              ) / (select n from viewers), 2) end,
         'share sheets opened per viewer'
  union all
  select 'activation', count(*)::numeric, 'portraits submitted'
  from public.portraits, span
  where submitted_at::date >= span.since;
$$;

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
    where a.event = 'active_day'
    group by a.install_id
  ),
  cohort as (
    select f.install_id, f.day_zero
    from first_seen f, today
    where f.day_zero >= today.d - greatest(window_days, 1)
  ),
  came_back as (
    select
      c.day_zero,
      c.install_id,
      max((a.occurred_on = c.day_zero + 1)::int) as d1,
      max((a.occurred_on = c.day_zero + 7)::int) as d7
    from cohort c
    join public.analytics_events a
      on a.install_id = c.install_id and a.event = 'active_day'
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

create or replace function public.participation_mix(window_days integer default 7)
returns table (segment text, installs bigint, percent numeric)
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
    select ((now() at time zone 'utc')::date - greatest(window_days, 1)) as since
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
        'human_remembered', 'share_sheet_opened'
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

create or replace function public.growth_gate(window_days integer default 28)
returns table (check_name text, actual numeric, threshold numeric, passed boolean)
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
    select ((now() at time zone 'utc')::date - greatest(window_days, 1)) as since
  ),
  viewers as (
    select count(distinct a.install_id)::numeric as n
    from public.analytics_events a, span
    where a.event = 'today_viewed' and a.occurred_on >= span.since
  ),
  sharers as (
    select count(distinct a.install_id)::numeric as n
    from public.analytics_events a, span
    where a.event = 'share_sheet_opened' and a.occurred_on >= span.since
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

-- ---------------------------------------------------------------------------
-- Journey funnels. Durable product rows are used wherever they exist.
-- ---------------------------------------------------------------------------

create or replace function public.analytics_journey_funnels(
  window_days integer default 28
)
returns table (
  journey text,
  stage text,
  stage_order integer,
  actors bigint,
  events bigint,
  conversion_percent numeric
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
    select
      now() - make_interval(days => greatest(window_days, 1)) as since_at,
      (now() at time zone 'utc')::date - greatest(window_days, 1) as since_day
  ),
  stages as (
    select 'invitation'::text journey, 'received'::text stage, 1 stage_order,
           count(distinct i.user_id)::bigint actors, count(*)::bigint events
    from public.draw_invitations i, span
    where i.created_at >= span.since_at
    union all
    select 'invitation', 'opened', 2,
           count(distinct i.user_id)::bigint, count(*)::bigint
    from public.draw_invitations i, span
    where i.created_at >= span.since_at and i.opened_at is not null
    union all
    select 'invitation', 'accepted', 3,
           count(distinct i.user_id)::bigint, count(*)::bigint
    from public.draw_invitations i, span
    where i.created_at >= span.since_at and i.response = 'accepted'

    union all
    select 'portrait', 'accepted', 1,
           count(distinct i.user_id)::bigint, count(*)::bigint
    from public.draw_invitations i, span
    where i.responded_at >= span.since_at and i.response = 'accepted'
    union all
    select 'portrait', 'started', 2,
           count(distinct p.user_id)::bigint, count(*)::bigint
    from public.portraits p
    join public.draw_invitations i
      on i.draw_id = p.draw_id and i.response = 'accepted'
    cross join span
    where i.responded_at >= span.since_at
    union all
    select 'portrait', 'submitted', 3,
           count(distinct p.user_id)::bigint, count(*)::bigint
    from public.portraits p
    join public.draw_invitations i
      on i.draw_id = p.draw_id and i.response = 'accepted'
    cross join span
    where i.responded_at >= span.since_at and p.submitted_at is not null

    union all
    select 'question', 'started', 1,
           count(distinct a.user_id)::bigint, count(*)::bigint
    from public.analytics_events a, span
    where a.event = 'question_started' and a.occurred_on >= span.since_day
    union all
    select 'question', 'submitted', 2,
           count(distinct q.author_id)::bigint, count(*)::bigint
    from public.questions q, span
    where q.created_at >= span.since_at
    union all
    select 'question', 'approved', 3,
           count(distinct q.author_id)::bigint, count(*)::bigint
    from public.questions q, span
    where q.created_at >= span.since_at and q.status = 'approved'
    union all
    select 'question', 'answered', 4,
           count(distinct q.author_id)::bigint, count(*)::bigint
    from public.questions q, span
    where q.created_at >= span.since_at and q.answered_at is not null

    union all
    select 'memory', 'remembered', 1,
           count(distinct a.install_id)::bigint, count(*)::bigint
    from public.analytics_events a, span
    where a.event = 'human_remembered' and a.occurred_on >= span.since_day
    union all
    select 'memory', 'library_reopened', 2,
           count(distinct opened.install_id)::bigint, count(*)::bigint
    from public.analytics_events opened, span
    where opened.event = 'remembered_library_opened'
      and opened.occurred_on >= span.since_day
      and exists (
        select 1 from public.analytics_events remembered
        where remembered.install_id = opened.install_id
          and remembered.event = 'human_remembered'
          and remembered.created_at <= opened.created_at
          and remembered.occurred_on >= span.since_day
      )
  ),
  measured as (
    select s.*,
           lag(s.actors) over (
             partition by s.journey order by s.stage_order
           ) as prior_actors
    from stages s
  )
  select
    m.journey,
    m.stage,
    m.stage_order,
    m.actors,
    m.events,
    case when m.stage_order = 1 then 100::numeric
         when coalesce(m.prior_actors, 0) = 0 then 0::numeric
         else round(m.actors::numeric * 100 / m.prior_actors, 1) end
  from measured m
  order by m.journey, m.stage_order;
end;
$$;

create or replace function public.analytics_notification_attribution(
  window_days integer default 28
)
returns table (
  category text,
  source text,
  action text,
  destination text,
  opens bigint
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
    select (now() at time zone 'utc')::date - greatest(window_days, 1) as since
  )
  select
    coalesce(a.properties ->> 'category', 'unknown'),
    coalesce(a.properties ->> 'source', 'unknown'),
    coalesce(a.properties ->> 'action', 'unknown'),
    coalesce(a.properties ->> 'destination', 'unknown'),
    count(*)::bigint
  from public.analytics_events a, span
  where a.event = 'notification_opened' and a.occurred_on >= span.since
  group by 1, 2, 3, 4
  order by count(*) desc, 1, 2, 3, 4;
end;
$$;

revoke execute on function public.analytics_journey_funnels(integer)
  from public, anon;
revoke execute on function public.analytics_notification_attribution(integer)
  from public, anon;
grant execute on function public.analytics_journey_funnels(integer)
  to authenticated;
grant execute on function public.analytics_notification_attribution(integer)
  to authenticated;
