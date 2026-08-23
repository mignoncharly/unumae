-- Phase 16 — where the scheduled jobs keep their credentials.
--
-- `invoke_function` first read these from database settings, which is the
-- pattern Supabase's own documentation uses. It does not work here:
--
--   ERROR:  permission denied to set parameter "app.functions_url"
--
-- The project's `postgres` role is not a superuser, so it cannot
-- `alter database ... set` a custom parameter. That is a good thing about
-- managed Postgres rather than an obstacle to route around.
--
-- A table is better anyway. A GUC is invisible — nothing lists it, nothing
-- audits it, and its value leaks into any error message that quotes the
-- statement that set it. This is explicit, revocable, and greppable.
--
-- It holds a service role key, so the grants matter more here than anywhere
-- else in the schema: RLS is on, no policy exists, and every client role is
-- revoked. The only reader is `invoke_function`, which is security definer and
-- itself executable by nobody but the scheduler.

create table if not exists public.job_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.job_secrets enable row level security;

comment on table public.job_secrets is
  'Credentials for the nightly jobs. No policy, no grants: service role only.';

/*
 * Call one of our own Edge Functions.
 *
 * pg_net is asynchronous by design: this queues the request and returns
 * immediately. That is the right shape for a nightly job — a slow translation
 * batch must not hold a cron worker open — but it means the return value says
 * the request was queued, not that it succeeded. What happened afterwards is in
 * net._http_response, and what we asked for is in job_runs.
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

  select s.value into base_url
  from public.job_secrets s where s.key = 'functions_url';

  select s.value into service_key
  from public.job_secrets s where s.key = 'service_role_key';

  if base_url is null or service_key is null then
    -- Recorded rather than raised. A cron job that throws is a cron job whose
    -- failure nobody sees until they go looking in a log they have never
    -- opened; a row in job_runs is visible from the moderation console.
    insert into public.job_runs (job, ok, detail)
    values (
      function_name,
      false,
      'job_secrets is missing functions_url or service_role_key — run npm run db:settings'
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

revoke all on public.job_secrets from anon, authenticated;
revoke execute on function public.invoke_function(text)
  from public, anon, authenticated;
