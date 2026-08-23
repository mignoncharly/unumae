-- Phase 16 — notification and translation orchestration.
--
-- Two Edge Functions have been deployed and nothing has ever called them. The
-- database decides who should be told what; the functions turn that into a push
-- message or a translation. Between the two there was a gap the size of "run
-- this every night", filled until now by me invoking them by hand.
--
-- pg_cron runs SQL, not HTTP. Reaching an Edge Function from inside Postgres
-- needs pg_net, so this migration installs it when the project has it and
-- degrades to a recorded status when it does not — the same shape as the
-- Phase 4 scheduler, and for the same reason: a scheduled job that silently
-- does not exist is worse than no scheduled job.
--
-- What this deliberately does not add: any new reason to message somebody.
-- Four notification categories exist and there is no code path for a fifth
-- (Phase 10). Orchestration here means "the four that exist are actually sent",
-- never "we found another occasion to interrupt you".

create table if not exists public.job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  ran_at timestamptz not null default now(),
  ok boolean not null,
  detail text
);

alter table public.job_runs enable row level security;

comment on table public.job_runs is
  'What the scheduled jobs did. Read by moderators, written by the jobs.';

create index if not exists job_runs_job_time
  on public.job_runs (job, ran_at desc);

/*
 * Call one of our own Edge Functions.
 *
 * The service role key is read from a database setting rather than written
 * here, so this migration carries no secret and can sit in the repository. The
 * setting is applied out of band — see docs/OPERATIONS.md.
 *
 * pg_net is asynchronous by design: this queues the request and returns
 * immediately. That is the right shape for a nightly job — a slow translation
 * batch must not hold a cron worker open — but it means the return value says
 * the request was queued, not that it succeeded.
 */
create or replace function public.invoke_function(function_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  service_key text;
  request_id bigint;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    insert into public.job_runs (job, ok, detail)
    values (function_name, false, 'pg_net is not installed');
    return null;
  end if;

  base_url := current_setting('app.functions_url', true);
  service_key := current_setting('app.service_role_key', true);

  if base_url is null or service_key is null then
    insert into public.job_runs (job, ok, detail)
    values (
      function_name,
      false,
      'app.functions_url or app.service_role_key is not set'
    );
    return null;
  end if;

  select net.http_post(
    url := base_url || '/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  ) into request_id;

  insert into public.job_runs (job, ok, detail)
  values (function_name, true, 'queued as request ' || request_id::text);

  return request_id;
end;
$$;

/*
 * What the jobs have been doing.
 *
 * A scheduled job nobody can see the result of is indistinguishable from a
 * scheduled job that is not running — which is precisely how run_daily_draw
 * managed to be broken from Phase 4 to Phase 14 without anybody noticing.
 */
create or replace function public.job_history(limit_rows integer default 50)
returns table (
  job text,
  ran_at timestamptz,
  ok boolean,
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
  select r.job, r.ran_at, r.ok, r.detail
  from public.job_runs r
  order by r.ran_at desc
  limit greatest(limit_rows, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- The schedule
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    insert into public.scheduler_status (id, installed, detail)
    values (true, false, 'pg_net is not available; Edge Functions are not scheduled')
    on conflict (id) do update
      set detail = excluded.detail, checked_at = now();
    return;
  end if;

  execute 'create extension if not exists pg_net';

  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return;
  end if;

  perform cron.unschedule(jobname)
  from cron.job
  where jobname in ('unumae-send-notifications', 'unumae-translate-portraits');

  -- 00:15 UTC, five minutes after notifications_due() is populated at 00:10.
  perform cron.schedule(
    'unumae-send-notifications',
    '15 0 * * *',
    $job$select public.invoke_function('send-notifications')$job$
  );

  -- 01:00 UTC. After publication, so the day's portrait is approved and
  -- translatable, and far enough from the draw that a slow vendor cannot
  -- interfere with the part of the night that matters.
  perform cron.schedule(
    'unumae-translate-portraits',
    '0 1 * * *',
    $job$select public.invoke_function('translate-portraits')$job$
  );
exception
  when others then
    insert into public.scheduler_status (id, installed, detail)
    values (true, false, 'Edge Function scheduling failed: ' || sqlerrm)
    on conflict (id) do update
      set detail = excluded.detail, checked_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.job_runs from anon, authenticated;

revoke execute on function public.invoke_function(text)
  from public, anon, authenticated;
revoke execute on function public.job_history(integer) from public, anon;
grant execute on function public.job_history(integer) to authenticated;
