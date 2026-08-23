-- Phase 11 — product analytics, first-party only
--
-- The plan asks for real analytics from Beta, and names the KPIs that matter:
-- activation, curiosity, engagement, memory, organic sharing — "not just
-- DAU / MAU".
--
-- What that must not become is surveillance. The shape below is the whole
-- defence:
--
--   * the event list is an enum. Nothing can be recorded that is not one of
--     these, so "what do we collect?" has an exact answer
--   * there is no column for an IP address, a user agent, a device model, an
--     advertising id, or a location. Not blank — absent
--   * no third party receives any of it; it is a table in our own database
--   * rows are deleted after 90 days, by a scheduled job rather than a promise

create type public.analytics_event as enum (
  'app_opened',
  'today_viewed',
  'portrait_completed',
  'archive_opened',
  'question_started',
  'question_submitted',
  'question_voted',
  'human_remembered',
  'signup_started',
  'signup_completed',
  'selection_accepted',
  'selection_declined',
  'notification_opened',
  'share_started',
  'share_completed',
  'language_changed'
);

create table public.analytics_events (
  id uuid primary key default extensions.gen_random_uuid(),

  -- Null for guests, and detached rather than deleted when an account goes:
  -- the count of what happened stays true, the person is gone.
  user_id uuid references public.profiles (id) on delete set null,

  /*
   * A random identifier for this installation, generated on the device.
   *
   * It exists for one reason: "did people come back the next day" cannot be
   * answered without it, and that is the single most important thing to know
   * before spending anything on growth. It is not linked to an advertising
   * profile, never leaves this database, and is disclosed in the app's privacy
   * screen rather than buried in a policy.
   */
  install_id uuid not null,

  event public.analytics_event not null,
  properties jsonb not null default '{}'::jsonb,

  -- The UTC day, for retention and for cohorting without scanning timestamps.
  occurred_on date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),

  constraint analytics_events_properties_small
    check (pg_column_size(properties) <= 2048)
);

create index idx_analytics_events_day on public.analytics_events (occurred_on);
create index idx_analytics_events_install
  on public.analytics_events (install_id, occurred_on);
create index idx_analytics_events_kind
  on public.analytics_events (event, occurred_on);

alter table public.analytics_events enable row level security;

comment on table public.analytics_events is
  'First-party product analytics. No IP, no user agent, no device, no location. Deleted after 90 days.';

-- ---------------------------------------------------------------------------
-- Recording
-- ---------------------------------------------------------------------------
--
-- Batched, because a screen that opens fires several events and each one
-- should not be a round trip. Rate limited, because this is the one endpoint a
-- guest can write to.

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

  -- Generous for real use, and far below what would be needed to fill a table.
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
  -- An unknown event name is dropped rather than raising: a client from an
  -- older release must not fail because it knows a name we removed.
  where item ->> 'event' = any (
    select unnest(enum_range(null::public.analytics_event))::text
  );

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- ---------------------------------------------------------------------------
-- The numbers that actually matter
-- ---------------------------------------------------------------------------
--
-- The plan is explicit that DAU/MAU is not the point. These five are.

create or replace function public.analytics_kpis(window_days integer default 7)
returns table (
  metric text,
  value numeric,
  detail text
)
language sql
stable
security definer
set search_path = ''
as $$
  with span as (
    select ((now() at time zone 'utc')::date - window_days) as since
  ),
  viewers as (
    select count(distinct install_id)::numeric as n
    from public.analytics_events, span
    where event = 'today_viewed' and occurred_on >= span.since
  ),
  returning_installs as (
    -- Curiosity: came on one day, came back on the next.
    select count(*)::numeric as n
    from (
      select distinct a.install_id
      from public.analytics_events a
      join public.analytics_events b
        on b.install_id = a.install_id
       and b.occurred_on = a.occurred_on + 1
      , span
      where a.event = 'today_viewed'
        and b.event = 'today_viewed'
        and a.occurred_on >= span.since
    ) as came_back
  ),
  first_seen as (
    select count(distinct install_id)::numeric as n
    from public.analytics_events, span
    where event = 'app_opened' and occurred_on >= span.since
  )
  select 'viewers', (select n from viewers),
         'distinct installs that saw a Human'
  union all
  select 'curiosity',
         case when (select n from first_seen) = 0 then 0
              else round((select n from returning_installs)
                         / (select n from first_seen) * 100, 1) end,
         'percent who came back the next day'
  union all
  select 'engagement',
         case when (select n from viewers) = 0 then 0
              else round((
                select count(*)::numeric from public.analytics_events, span
                where event = 'question_submitted' and occurred_on >= span.since
              ) / (select n from viewers), 2) end,
         'questions per viewer'
  union all
  select 'memory',
         case when (select n from viewers) = 0 then 0
              else round((
                select count(*)::numeric from public.analytics_events, span
                where event = 'human_remembered' and occurred_on >= span.since
              ) / (select n from viewers), 2) end,
         'Remembers per viewer'
  union all
  select 'sharing',
         case when (select n from viewers) = 0 then 0
              else round((
                select count(*)::numeric from public.analytics_events, span
                where event = 'share_completed' and occurred_on >= span.since
              ) / (select n from viewers), 2) end,
         'shares per viewer'
  union all
  select 'activation',
         (select count(*)::numeric from public.analytics_events, span
          where event = 'portrait_completed' and occurred_on >= span.since),
         'portraits finished';
$$;

comment on function public.analytics_kpis is
  'Activation, curiosity, engagement, memory, sharing. Deliberately not DAU/MAU.';

-- ---------------------------------------------------------------------------
-- Retention
-- ---------------------------------------------------------------------------
--
-- Ninety days, enforced by a job. A retention policy nobody runs is a sentence
-- in a document, not a limit.

create or replace function public.purge_old_analytics()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.analytics_events
  where occurred_on < (now() at time zone 'utc')::date - 90;

  get diagnostics removed = row_count;
  return removed;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname)
    from cron.job
    where jobname = 'unumae-purge-analytics';

    perform cron.schedule(
      'unumae-purge-analytics',
      '30 3 * * *',
      'select public.purge_old_analytics()'
    );
  end if;
exception
  when others then
    raise notice 'Could not schedule analytics purge: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.analytics_events from anon, authenticated;

revoke execute on function public.analytics_kpis(integer) from public, anon;
revoke execute on function public.purge_old_analytics()
  from public, anon, authenticated;
revoke execute on function public.track_events(uuid, jsonb) from public;

-- A guest is most of the audience, so a guest has to be able to record that
-- they looked. Writing is all they can do: there is no policy allowing anyone
-- to read this table from a client, ever.
grant execute on function public.track_events(uuid, jsonb) to anon, authenticated;

-- Readable through the KPI function only, and only by a moderator.
grant execute on function public.analytics_kpis(integer) to authenticated;

create or replace function public.analytics_kpis_guarded(
  window_days integer default 7
)
returns table (metric text, value numeric, detail text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  return query select * from public.analytics_kpis(window_days);
end;
$$;

revoke execute on function public.analytics_kpis(integer) from authenticated;
revoke execute on function public.analytics_kpis_guarded(integer)
  from public, anon;
grant execute on function public.analytics_kpis_guarded(integer) to authenticated;
