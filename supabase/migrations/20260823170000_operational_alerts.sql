-- Phase 1 — explicit operator alerts for failures and time-sensitive queues.
-- This follows the delivery outcome and cycle recovery migrations above.

create table public.operational_alerts (
  id bigint generated always as identity primary key,
  code text not null,
  severity text not null check (severity in ('warning', 'critical')),
  message text not null,
  entity_key text,
  draw_id uuid references public.daily_draws (id) on delete set null,
  job_run_id bigint references public.job_runs (id) on delete set null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.moderators (user_id) on delete set null
);

create unique index operational_alert_job_open
  on public.operational_alerts (code, job_run_id)
  where resolved_at is null and job_run_id is not null;
create unique index operational_alert_draw_open
  on public.operational_alerts (code, draw_id)
  where resolved_at is null and draw_id is not null;
create unique index operational_alert_entity_open
  on public.operational_alerts (code, entity_key)
  where resolved_at is null and entity_key is not null;

alter table public.operational_alerts enable row level security;
revoke all on public.operational_alerts from anon, authenticated;

create or replace function public.refresh_operational_alerts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  created integer := 0;
  changed integer;
begin
  -- Conditions that recovered themselves should leave the active list while
  -- retaining their history.
  update public.operational_alerts a
  set resolved_at = now()
  where a.resolved_at is null
    and a.code = 'job_stalled'
    and exists (
      select 1 from public.job_runs r
      where r.id = a.job_run_id and r.status <> 'queued'
    );

  update public.operational_alerts a
  set resolved_at = now()
  where a.resolved_at is null
    and a.code = 'portrait_queue_age'
    and not exists (
      select 1 from public.portraits p
      where p.id::text = a.entity_key
        and p.status in ('submitted', 'in_review')
        and p.submitted_at < now() - interval '12 hours'
    );

  update public.operational_alerts a
  set resolved_at = now()
  where a.resolved_at is null
    and a.code = 'cycle_at_risk'
    and exists (
      select 1 from public.daily_draws d
      where d.id = a.draw_id
        and d.selection_status in ('ready', 'live', 'completed', 'cancelled')
    );

  insert into public.operational_alerts (
    code, severity, message, job_run_id, entity_key
  )
  select
    'job_failed',
    case when r.job in ('daily-draw', 'publish-cycle')
      then 'critical' else 'warning' end,
    r.job || ' failed: ' || coalesce(r.detail, 'No detail was recorded'),
    r.id,
    'job:' || r.id::text
  from public.job_runs r
  where r.status = 'failed'
    and r.ran_at > now() - interval '7 days'
    and not exists (
      select 1 from public.operational_alerts a
      where a.code = 'job_failed'
        and a.job_run_id = r.id
    )
  on conflict do nothing;
  get diagnostics changed = row_count;
  created := created + changed;

  insert into public.operational_alerts (
    code, severity, message, job_run_id, entity_key
  )
  select
    'job_stalled',
    'critical',
    r.job || ' has been waiting for an Edge Function result for more than 10 minutes',
    r.id,
    'job:' || r.id::text
  from public.job_runs r
  where r.status = 'queued'
    and r.ran_at < now() - interval '10 minutes'
    and not exists (
      select 1 from public.operational_alerts a
      where a.code = 'job_stalled'
        and a.job_run_id = r.id
    )
  on conflict do nothing;
  get diagnostics changed = row_count;
  created := created + changed;

  insert into public.operational_alerts (
    code, severity, message, draw_id, entity_key
  )
  select
    'portrait_queue_age',
    'critical',
    'A selected person has waited more than 12 hours for portrait review',
    p.draw_id,
    p.id::text
  from public.portraits p
  where p.status in ('submitted', 'in_review')
    and p.submitted_at < now() - interval '12 hours'
    and not exists (
      select 1 from public.operational_alerts a
      where a.code = 'portrait_queue_age'
        and a.entity_key = p.id::text
    )
  on conflict do nothing;
  get diagnostics changed = row_count;
  created := created + changed;

  insert into public.operational_alerts (
    code, severity, message, draw_id, entity_key
  )
  select
    'cycle_at_risk',
    'critical',
    'A cycle less than 24 hours away is not ready for publication',
    d.id,
    d.id::text
  from public.daily_draws d
  where d.selection_date >= (now() at time zone 'utc')::date
    and d.selection_date <= (now() at time zone 'utc')::date + 1
    and d.selection_status not in ('ready', 'live', 'completed', 'cancelled')
    and not exists (
      select 1 from public.operational_alerts a
      where a.code = 'cycle_at_risk'
        and a.draw_id = d.id
    )
  on conflict do nothing;
  get diagnostics changed = row_count;
  created := created + changed;

  return created;
end;
$$;

create or replace function public.operational_alerts()
returns table (
  alert_id bigint,
  code text,
  severity text,
  message text,
  detected_at timestamptz,
  draw_id uuid,
  job_run_id bigint
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
  select a.id, a.code, a.severity, a.message, a.detected_at, a.draw_id, a.job_run_id
  from public.operational_alerts a
  where a.resolved_at is null
  order by
    case when a.severity = 'critical' then 0 else 1 end,
    a.detected_at desc;
end;
$$;

create or replace function public.resolve_operational_alert(target_alert bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  update public.operational_alerts
  set resolved_at = now(), resolved_by = (select auth.uid())
  where id = target_alert and resolved_at is null;

  return found;
end;
$$;

revoke execute on function public.refresh_operational_alerts()
  from public, anon, authenticated;
grant execute on function public.refresh_operational_alerts() to service_role;
revoke execute on function public.operational_alerts() from public, anon;
revoke execute on function public.resolve_operational_alert(bigint) from public, anon;
grant execute on function public.operational_alerts() to authenticated;
grant execute on function public.resolve_operational_alert(bigint) to authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname)
    from cron.job
    where jobname = 'unumae-operational-alerts';

    perform cron.schedule(
      'unumae-operational-alerts',
      '*/5 * * * *',
      'select public.refresh_operational_alerts()'
    );
  end if;
exception when others then
  insert into public.job_runs (job, ok, status, detail, completed_at)
  values ('schedule-alerts', false, 'failed', left(sqlerrm, 1000), now());
end;
$$;
