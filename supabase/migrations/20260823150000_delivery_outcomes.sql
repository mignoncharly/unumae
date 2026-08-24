-- Phase 1 — notification delivery that is timely, private, and observable.

-- ---------------------------------------------------------------------------
-- Delivery attempts: provider responses, not merely queued HTTP calls
-- ---------------------------------------------------------------------------

create type public.notification_channel as enum ('push', 'email');
create type public.delivery_status as enum ('accepted', 'failed');

create table public.notification_deliveries (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  category public.notification_category not null,
  dedupe_key text not null,
  channel public.notification_channel not null,
  -- A SHA-256 hash permits correlation without retaining a push token or email.
  destination_hash text not null,
  status public.delivery_status not null,
  provider_id text,
  error_code text,
  attempted_at timestamptz not null default now(),
  constraint notification_destination_hash_length
    check (char_length(destination_hash) = 64)
);

create index notification_deliveries_event
  on public.notification_deliveries (user_id, category, dedupe_key, attempted_at desc);

alter table public.notification_deliveries enable row level security;
revoke all on public.notification_deliveries from anon, authenticated;

create or replace function public.record_notification_delivery(
  target_user uuid,
  sent_category public.notification_category,
  key text,
  delivery_channel public.notification_channel,
  target_hash text,
  delivery_succeeded boolean,
  provider_reference text default null,
  failure_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_deliveries (
    user_id,
    category,
    dedupe_key,
    channel,
    destination_hash,
    status,
    provider_id,
    error_code
  ) values (
    target_user,
    sent_category,
    key,
    delivery_channel,
    target_hash,
    case when delivery_succeeded then 'accepted' else 'failed' end
      ::public.delivery_status,
    provider_reference,
    failure_code
  );

  -- The logical notification is complete when at least one channel was
  -- accepted by its provider. Failed attempts remain retryable.
  if delivery_succeeded then
    insert into public.notification_log (user_id, category, dedupe_key)
    values (target_user, sent_category, key)
    on conflict (user_id, category, dedupe_key) do nothing;
  end if;

  return true;
end;
$$;

create or replace function public.disable_push_token(failed_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.push_tokens where token = failed_token;
  return found;
end;
$$;

revoke execute on function public.record_notification_delivery(
  uuid,
  public.notification_category,
  text,
  public.notification_channel,
  text,
  boolean,
  text,
  text
) from public, anon, authenticated;
revoke execute on function public.disable_push_token(text)
  from public, anon, authenticated;
grant execute on function public.record_notification_delivery(
  uuid,
  public.notification_category,
  text,
  public.notification_channel,
  text,
  boolean,
  text,
  text
) to service_role;
grant execute on function public.disable_push_token(text) to service_role;

-- ---------------------------------------------------------------------------
-- One row per notification event, with all of the person's current devices
-- ---------------------------------------------------------------------------

drop function if exists public.notifications_due();

create or replace function public.notifications_due()
returns table (
  user_id uuid,
  tokens text[],
  email text,
  locale text,
  category public.notification_category,
  dedupe_key text,
  subject_name text,
  route_data jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with recipients as (
    select
      p.id,
      p.locale,
      p.account_status,
      case when u.email_confirmed_at is not null then u.email::text end as email,
      coalesce(s.daily, false) as wants_daily,
      coalesce(s.selected, true) as wants_selected,
      coalesce(s.answered, true) as wants_answered,
      coalesce(s.anniversary, false) as wants_anniversary,
      coalesce(
        (
          select array_agg(t.token order by t.last_seen_at desc)
          from public.push_tokens t
          where t.user_id = p.id
        ),
        '{}'::text[]
      ) as tokens
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.notification_settings s on s.user_id = p.id
  ), current_day as (
    select (now() at time zone 'utc')::date as value
  )
  -- Today's Human.
  select
    r.id,
    r.tokens,
    r.email,
    r.locale,
    'daily'::public.notification_category,
    d.selection_date::text,
    human.display_name,
    jsonb_build_object('category', 'daily', 'drawId', d.id)
  from public.daily_draws d
  join public.profiles human on human.id = d.selected_user_id
  cross join recipients r
  cross join current_day today
  where d.selection_status = 'live'
    and d.selection_date = today.value
    and r.wants_daily
    and r.account_status = 'active'
    and cardinality(r.tokens) > 0
    and r.id <> d.selected_user_id
    and not exists (
      select 1 from public.notification_log l
      where l.user_id = r.id
        and l.category = 'daily'
        and l.dedupe_key = d.selection_date::text
    )

  union all

  -- Selection. Email is a fallback when no push device accepts the message.
  select
    r.id,
    r.tokens,
    r.email,
    r.locale,
    'selected'::public.notification_category,
    i.id::text,
    null::text,
    jsonb_build_object(
      'category', 'selected',
      'invitationId', i.id,
      'drawId', i.draw_id
    )
  from public.draw_invitations i
  join public.daily_draws d on d.id = i.draw_id
  join recipients r on r.id = i.user_id
  where i.response is null
    and i.acceptance_deadline > now()
    and d.selection_status = 'awaiting_acceptance'
    and r.account_status = 'active'
    and r.wants_selected
    and (cardinality(r.tokens) > 0 or r.email is not null)
    and not exists (
      select 1 from public.notification_log l
      where l.user_id = r.id
        and l.category = 'selected'
        and l.dedupe_key = i.id::text
    )

  union all

  -- A question was answered.
  select
    r.id,
    r.tokens,
    r.email,
    r.locale,
    'answered'::public.notification_category,
    q.id::text,
    human.display_name,
    jsonb_build_object(
      'category', 'answered',
      'questionId', q.id,
      'drawId', q.draw_id
    )
  from public.questions q
  join public.daily_draws d on d.id = q.draw_id
  join public.profiles human on human.id = d.selected_user_id
  join recipients r on r.id = q.author_id
  where q.answered_at is not null
    and r.wants_answered
    and r.account_status = 'active'
    and cardinality(r.tokens) > 0
    and not exists (
      select 1 from public.notification_log l
      where l.user_id = r.id
        and l.category = 'answered'
        and l.dedupe_key = q.id::text
    )

  union all

  -- A remembered Human's anniversary. This is private memory, not popularity:
  -- it derives only from the caller's own Remember row.
  select
    r.id,
    r.tokens,
    r.email,
    r.locale,
    'anniversary'::public.notification_category,
    d.id::text || ':' || today.value::text,
    human.display_name,
    jsonb_build_object('category', 'anniversary', 'drawId', d.id)
  from public.remembers remembered
  join public.daily_draws d on d.id = remembered.draw_id
  join public.profiles human on human.id = d.selected_user_id
  join recipients r on r.id = remembered.user_id
  cross join current_day today
  where d.selection_status = 'completed'
    and d.selection_date = (today.value - interval '1 year')::date
    and r.wants_anniversary
    and r.account_status = 'active'
    and cardinality(r.tokens) > 0
    and not exists (
      select 1 from public.notification_log l
      where l.user_id = r.id
        and l.category = 'anniversary'
        and l.dedupe_key = d.id::text || ':' || today.value::text
    );
$$;

revoke execute on function public.notifications_due()
  from public, anon, authenticated;
grant execute on function public.notifications_due() to service_role;

-- ---------------------------------------------------------------------------
-- Edge Function runs begin queued and are completed by the function itself
-- ---------------------------------------------------------------------------

alter table public.job_runs
  add column if not exists status text,
  add column if not exists request_id bigint,
  add column if not exists completed_at timestamptz;

update public.job_runs
set status = case when ok then 'succeeded' else 'failed' end,
    completed_at = coalesce(completed_at, ran_at)
where status is null;

alter table public.job_runs
  alter column status set default 'queued',
  alter column status set not null;

alter table public.job_runs
  add constraint job_runs_status_valid
  check (status in ('queued', 'succeeded', 'failed'));

create or replace function public.complete_job_run(
  target_run bigint,
  succeeded boolean,
  result_detail text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.job_runs
  set status = case when succeeded then 'succeeded' else 'failed' end,
      ok = succeeded,
      detail = left(result_detail, 1000),
      completed_at = now()
  where id = target_run
    and status = 'queued';

  return found;
end;
$$;

create or replace function public.invoke_function(function_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  service_key text;
  net_request_id bigint;
  run_id bigint;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    insert into public.job_runs (job, ok, status, detail, completed_at)
    values (function_name, false, 'failed', 'pg_net is not installed', now())
    returning id into run_id;
    return null;
  end if;

  select s.value into base_url
  from public.job_secrets s where s.key = 'functions_url';

  select s.value into service_key
  from public.job_secrets s where s.key = 'service_role_key';

  if base_url is null or service_key is null then
    insert into public.job_runs (job, ok, status, detail, completed_at)
    values (
      function_name,
      false,
      'failed',
      'job_secrets is missing functions_url or service_role_key',
      now()
    )
    returning id into run_id;
    return null;
  end if;

  insert into public.job_runs (job, ok, status, detail)
  values (function_name, false, 'queued', 'Waiting for Edge Function result')
  returning id into run_id;

  select net.http_post(
    url := base_url || '/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('jobRunId', run_id)
  ) into net_request_id;

  update public.job_runs
  set request_id = net_request_id,
      detail = 'Request ' || net_request_id::text || ' queued'
  where id = run_id;

  return net_request_id;
exception
  when others then
    if run_id is not null then
      update public.job_runs
      set status = 'failed', ok = false, detail = left(sqlerrm, 1000), completed_at = now()
      where id = run_id;
    else
      insert into public.job_runs (job, ok, status, detail, completed_at)
      values (function_name, false, 'failed', left(sqlerrm, 1000), now());
    end if;
    return null;
end;
$$;

create or replace function public.invoke_notifications_if_due()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('unumae-notifications')
  );

  if exists (
    select 1 from public.job_runs r
    where r.job = 'send-notifications'
      and r.status = 'queued'
      and r.ran_at > now() - interval '10 minutes'
  ) then
    return null;
  end if;

  if exists (select 1 from public.notifications_due() limit 1) then
    return public.invoke_function('send-notifications');
  end if;
  return null;
end;
$$;

drop function if exists public.job_history(integer);
create or replace function public.job_history(limit_rows integer default 50)
returns table (
  job text,
  ran_at timestamptz,
  ok boolean,
  job_status text,
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
  select r.job, r.ran_at, r.ok, r.status, r.detail
  from public.job_runs r
  order by r.ran_at desc
  limit greatest(limit_rows, 0);
end;
$$;

revoke execute on function public.complete_job_run(bigint, boolean, text)
  from public, anon, authenticated;
grant execute on function public.complete_job_run(bigint, boolean, text)
  to service_role;
revoke execute on function public.invoke_function(text)
  from public, anon, authenticated;
revoke execute on function public.invoke_notifications_if_due()
  from public, anon, authenticated;
revoke execute on function public.job_history(integer) from public, anon;
grant execute on function public.job_history(integer) to authenticated;

-- Five-minute fallback. New invitations also invoke delivery immediately in
-- the next migration; this schedule recovers from transient provider failures.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname)
    from cron.job
    where jobname = 'unumae-send-notifications';

    perform cron.schedule(
      'unumae-send-notifications',
      '*/5 * * * *',
      'select public.invoke_notifications_if_due()'
    );
  end if;
exception when others then
  insert into public.job_runs (job, ok, status, detail, completed_at)
  values ('schedule-notifications', false, 'failed', left(sqlerrm, 1000), now());
end;
$$;
