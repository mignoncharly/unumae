-- Phase 5 — scheduling the cycle
--
-- Nothing has been calling run_daily_draw. Article 4.2 fixes the timetable in
-- UTC, and this is where it becomes real:
--
--   D-2 00:00 UTC   freeze the pool and draw
--   D-2 00:10 UTC   notify the primary candidate
--   every 15 min    expire invitations whose 12 hours have run out
--
-- pg_cron may not be available on every plan or project. This migration
-- therefore installs the schedule when it can and records why it could not
-- when it cannot, rather than failing the whole deployment — an unscheduled
-- draw is a known gap, not a broken database.

create table if not exists public.scheduler_status (
  id boolean primary key default true,
  installed boolean not null,
  detail text not null,
  checked_at timestamptz not null default now(),
  constraint scheduler_status_singleton check (id)
);

alter table public.scheduler_status enable row level security;
revoke all on public.scheduler_status from anon, authenticated;

do $$
declare
  utc_today text := '(now() at time zone ''utc'')::date';
begin
  if not exists (
    select 1 from pg_available_extensions where name = 'pg_cron'
  ) then
    insert into public.scheduler_status (id, installed, detail)
    values (true, false, 'pg_cron is not available on this project')
    on conflict (id) do update
      set installed = false,
          detail = excluded.detail,
          checked_at = now();
    return;
  end if;

  execute 'create extension if not exists pg_cron';

  -- Unschedule first so re-running this is safe.
  perform cron.unschedule(jobname)
  from cron.job
  where jobname in (
    'onehuman-daily-draw',
    'onehuman-notify-candidate',
    'onehuman-expire-invitations'
  );

  -- D-2: freeze the pool and draw. Two days of lead time is what gives the
  -- selected person a day to write and the moderators a day to review.
  perform cron.schedule(
    'onehuman-daily-draw',
    '0 0 * * *',
    format('select public.run_daily_draw(%s + 2)', utc_today)
  );

  -- Ten minutes later, so the draw has certainly committed.
  perform cron.schedule(
    'onehuman-notify-candidate',
    '10 0 * * *',
    format('select public.notify_selected_candidate(%s + 2)', utc_today)
  );

  -- The 12-hour window has to be enforced by something that runs while nobody
  -- is looking, or a silent candidate would hold the cycle forever.
  perform cron.schedule(
    'onehuman-expire-invitations',
    '*/15 * * * *',
    'select public.expire_stale_invitations()'
  );

  insert into public.scheduler_status (id, installed, detail)
  values (true, true, 'pg_cron installed: draw, notify, expire')
  on conflict (id) do update
    set installed = true,
        detail = excluded.detail,
        checked_at = now();
exception
  when insufficient_privilege or undefined_function or undefined_table then
    insert into public.scheduler_status (id, installed, detail)
    values (true, false, 'pg_cron present but not usable: ' || sqlerrm)
    on conflict (id) do update
      set installed = false,
          detail = excluded.detail,
          checked_at = now();
end;
$$;

-- Exposed so the app and the operator can both see whether the cycle is
-- actually being driven. It says nothing about any person.
create or replace function public.scheduler_installed()
returns table (installed boolean, detail text, checked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.installed, s.detail, s.checked_at
  from public.scheduler_status s
  where s.id;
$$;

grant execute on function public.scheduler_installed() to authenticated;
