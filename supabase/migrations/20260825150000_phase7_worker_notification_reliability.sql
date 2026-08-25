-- Roadmap v2 Phase 7 — worker and notification reliability.

-- -------------------------------------------------------------------------
-- Durable Edge-run leases, bounded retries, and visible dead letters
-- -------------------------------------------------------------------------

alter table public.job_runs drop constraint if exists job_runs_status_valid;
alter table public.job_runs
  add column if not exists attempts integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists lease_token uuid,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists provider_category text;
alter table public.job_runs
  add constraint job_runs_status_valid
    check (status in ('queued', 'leased', 'succeeded', 'failed', 'dead_letter')),
  add constraint job_runs_attempts_valid
    check (attempts >= 0 and max_attempts between 1 and 20 and attempts <= max_attempts),
  add constraint job_runs_lease_complete check (
    (status = 'leased' and lease_token is not null and lease_expires_at is not null)
    or status <> 'leased'
  ),
  add constraint job_runs_provider_category_safe check (
    provider_category is null or provider_category in (
      'accepted', 'timeout', 'network', 'rate_limited', 'auth',
      'invalid_request', 'provider_error', 'malformed_response',
      'permanent_destination', 'not_configured', 'internal'
    )
  );
create index job_runs_active_retry
  on public.job_runs (status, next_attempt_at, lease_expires_at);

create or replace function public.claim_worker_run(
  target_run bigint,
  target_job text,
  presented_lease uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_run public.job_runs;
  claimed uuid;
begin
  select * into current_run from public.job_runs
  where id = target_run and job = target_job for update;
  if not found then return null; end if;

  if current_run.status = 'leased' then
    if presented_lease = current_run.lease_token
       and current_run.lease_expires_at > now() then
      return current_run.lease_token;
    end if;
    return null;
  end if;
  if current_run.status <> 'queued' or current_run.next_attempt_at > now() then
    return null;
  end if;
  if current_run.attempts >= current_run.max_attempts then
    update public.job_runs set status = 'dead_letter', ok = false,
      detail = 'Maximum worker attempts exhausted', completed_at = now()
    where id = target_run;
    return null;
  end if;

  claimed := extensions.gen_random_uuid();
  update public.job_runs set status = 'leased', attempts = attempts + 1,
    lease_token = claimed, lease_expires_at = now() + interval '5 minutes',
    detail = 'Worker lease acquired'
  where id = target_run;
  return claimed;
end;
$$;

create or replace function public.complete_worker_run(
  target_run bigint,
  target_lease uuid,
  succeeded boolean,
  retryable boolean,
  result_detail text,
  result_provider_category text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.job_runs
  where id = target_run and status = 'leased' and lease_token = target_lease
  for update;
  if not found then return false; end if;

  if result_provider_category is not null and result_provider_category not in (
    'accepted', 'timeout', 'network', 'rate_limited', 'auth',
    'invalid_request', 'provider_error', 'malformed_response',
    'permanent_destination', 'not_configured', 'internal'
  ) then
    raise exception 'Unsafe provider category' using errcode = 'check_violation';
  end if;

  update public.job_runs set
    status = case
      when succeeded then 'succeeded'
      when retryable and attempts >= max_attempts then 'dead_letter'
      when retryable then 'queued'
      else 'failed'
    end,
    ok = succeeded,
    detail = left(result_detail, 1000),
    provider_category = result_provider_category,
    lease_token = null,
    lease_expires_at = null,
    next_attempt_at = case when not succeeded and retryable
      then now() + make_interval(secs => least(900, 30 * attempts * attempts))
      else next_attempt_at end,
    completed_at = case
      when succeeded or not retryable or attempts >= max_attempts then now()
      else null end
  where id = target_run;
  return true;
end;
$$;

create or replace function public.recover_worker_runs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  insert into public.operational_alerts (
    code, severity, message, job_run_id, entity_key
  )
  select 'worker_stale_lease', 'critical',
    r.job || ' exceeded its worker lease', r.id, 'job:' || r.id::text
  from public.job_runs r
  where r.status = 'leased' and r.lease_expires_at <= now()
  on conflict do nothing;

  update public.job_runs set
    status = case when attempts >= max_attempts then 'dead_letter' else 'queued' end,
    ok = false,
    detail = case when attempts >= max_attempts
      then 'Worker lease expired after maximum attempts'
      else 'Worker lease expired; retry queued' end,
    provider_category = 'timeout',
    lease_token = null,
    lease_expires_at = null,
    next_attempt_at = now(),
    completed_at = case when attempts >= max_attempts then now() else null end
  where status = 'leased' and lease_expires_at <= now();
  get diagnostics changed = row_count;
  return changed;
end;
$$;

-- Replaces the earlier fire-and-forget dispatcher. One logical run is reused
-- until it succeeds, fails terminally, or exhausts its bounded attempts.
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
  worker_lease uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('worker:' || function_name));
  perform public.recover_worker_runs();

  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    insert into public.job_runs (job, ok, status, detail, completed_at)
    values (function_name, false, 'failed', 'pg_net is not installed', now());
    return null;
  end if;
  select value into base_url from public.job_secrets where key = 'functions_url';
  select value into service_key from public.job_secrets where key = 'service_role_key';
  if base_url is null or service_key is null then
    insert into public.job_runs (job, ok, status, detail, completed_at)
    values (function_name, false, 'failed',
      'Worker endpoint credentials are not configured', now());
    return null;
  end if;

  select id into run_id from public.job_runs
  where job = function_name and status = 'queued'
    and next_attempt_at <= now()
  order by ran_at limit 1 for update skip locked;
  if run_id is null and exists (
    select 1 from public.job_runs where job = function_name
      and status in ('queued', 'leased')
  ) then return null; end if;
  if run_id is null then
    insert into public.job_runs (job, ok, status, detail)
    values (function_name, false, 'queued', 'Waiting for worker dispatch')
    returning id into run_id;
  end if;

  worker_lease := public.claim_worker_run(run_id, function_name, null);
  if worker_lease is null then return null; end if;
  select net.http_post(
    url := base_url || '/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('jobRunId', run_id, 'leaseToken', worker_lease)
  ) into net_request_id;
  update public.job_runs set request_id = net_request_id,
    detail = 'Worker request queued' where id = run_id;
  return net_request_id;
exception when others then
  if run_id is not null and worker_lease is not null then
    perform public.complete_worker_run(
      run_id, worker_lease, false, true, 'Worker dispatch failed', 'network'
    );
  end if;
  return null;
end;
$$;

create or replace function public.retry_worker_runs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending record;
  dispatched integer := 0;
begin
  perform public.recover_worker_runs();
  for pending in
    select distinct on (job) job from public.job_runs
    where status = 'queued' and attempts > 0 and next_attempt_at <= now()
    order by job, ran_at
  loop
    if public.invoke_function(pending.job) is not null then
      dispatched := dispatched + 1;
    end if;
  end loop;
  return dispatched;
end;
$$;

-- -------------------------------------------------------------------------
-- Translation item retries and dead letters (no original text is retained)
-- -------------------------------------------------------------------------

create table public.translation_failures (
  target_kind text not null check (target_kind in ('portrait', 'question')),
  target_id uuid not null,
  target_field text not null,
  target_locale text not null check (target_locale in ('en', 'fr', 'de')),
  attempts integer not null default 1 check (attempts between 1 and 5),
  status text not null default 'retry' check (status in ('retry', 'dead_letter')),
  provider_category text not null,
  first_failed_at timestamptz not null default now(),
  last_failed_at timestamptz not null default now(),
  primary key (target_kind, target_id, target_field, target_locale)
);
alter table public.translation_failures enable row level security;
revoke all on public.translation_failures from anon, authenticated;

create or replace function public.record_translation_attempt(
  target_kind text,
  target_id uuid,
  target_field text,
  target_locale text,
  succeeded boolean,
  provider_category text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare result_status text;
begin
  if succeeded then
    delete from public.translation_failures f where f.target_kind = record_translation_attempt.target_kind
      and f.target_id = record_translation_attempt.target_id
      and f.target_field = record_translation_attempt.target_field
      and f.target_locale = record_translation_attempt.target_locale;
    return 'succeeded';
  end if;
  if provider_category is null or provider_category not in (
    'timeout', 'network', 'rate_limited', 'auth', 'invalid_request',
    'provider_error', 'malformed_response', 'internal'
  ) then raise exception 'Unsafe provider category' using errcode = 'check_violation'; end if;
  insert into public.translation_failures (
    target_kind, target_id, target_field, target_locale, provider_category
  ) values (target_kind, target_id, target_field, target_locale, provider_category)
  on conflict on constraint translation_failures_pkey do update set
    attempts = least(5, public.translation_failures.attempts + 1),
    status = case when public.translation_failures.attempts + 1 >= 5
      then 'dead_letter' else 'retry' end,
    provider_category = excluded.provider_category,
    last_failed_at = now()
  returning public.translation_failures.status into result_status;
  return result_status;
end;
$$;

create or replace function public.pending_translations(batch_size integer default 50)
returns table (portrait_id uuid, element_key public.portrait_element_key,
  original_text text, target_locale text)
language sql stable security definer set search_path = '' as $$
  select e.portrait_id, e.element_key, e.answer, locales.code
  from public.portrait_elements e
  join public.portraits p on p.id = e.portrait_id
  join public.daily_draws d on d.id = p.draw_id
  cross join (values ('en'), ('fr'), ('de')) as locales(code)
  where p.status = 'approved' and d.selection_status in ('live', 'completed')
    and d.human_number is not null
    and not exists (select 1 from public.portrait_element_translations tr
      where tr.portrait_id = e.portrait_id and tr.element_key = e.element_key
        and tr.locale = locales.code)
    and not exists (select 1 from public.translation_failures f
      where f.target_kind = 'portrait' and f.target_id = e.portrait_id
        and f.target_field = e.element_key::text and f.target_locale = locales.code
        and f.status = 'dead_letter')
  order by d.selection_date desc, e.portrait_id, e.element_key
  limit greatest(batch_size, 0);
$$;

create or replace function public.pending_question_translations(batch_size integer default 50)
returns table (question_id uuid, field public.question_translation_field,
  original_text text, target_locale text)
language sql stable security definer set search_path = '' as $$
  select q.id, source.field, source.original_text, locales.code
  from public.questions q join public.daily_draws d on d.id = q.draw_id
  cross join lateral (values
    ('body'::public.question_translation_field, q.body),
    ('answer'::public.question_translation_field, q.answer)
  ) source(field, original_text)
  cross join (values ('en'), ('fr'), ('de')) locales(code)
  where q.status = 'approved' and d.selection_status in ('live', 'completed')
    and d.redacted_at is null and source.original_text is not null
    and not exists (select 1 from public.question_translations tr
      where tr.question_id = q.id and tr.field = source.field
        and tr.locale = locales.code)
    and not exists (select 1 from public.translation_failures f
      where f.target_kind = 'question' and f.target_id = q.id
        and f.target_field = source.field::text and f.target_locale = locales.code
        and f.status = 'dead_letter')
  order by d.selection_date desc, q.created_at, source.field
  limit greatest(batch_size, 0);
$$;

-- -------------------------------------------------------------------------
-- Expo receipt queue: accepted tickets are checked after provider delivery
-- -------------------------------------------------------------------------

create table public.expo_push_receipts (
  ticket_id text primary key,
  push_token text not null references public.push_tokens (token) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'leased', 'dead_letter')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  available_at timestamptz not null default now() + interval '15 minutes',
  lease_token uuid,
  lease_expires_at timestamptz,
  provider_category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.expo_push_receipts enable row level security;
revoke all on public.expo_push_receipts from anon, authenticated;
create index expo_push_receipts_due on public.expo_push_receipts (status, available_at);

create or replace function public.enqueue_expo_push_receipt(
  target_ticket text, target_token text, target_user uuid
)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if char_length(target_ticket) not between 1 and 200 or not exists (
    select 1 from public.push_tokens t
    where t.token = target_token and t.user_id = target_user
  ) then return false; end if;
  insert into public.expo_push_receipts (ticket_id, push_token, user_id)
  values (target_ticket, target_token, target_user) on conflict do nothing;
  return true;
end;
$$;

create or replace function public.claim_expo_push_receipts(batch_size integer default 300)
returns table (ticket_id text, push_token text, lease_token uuid)
language plpgsql security definer set search_path = '' as $$
begin
  update public.expo_push_receipts set status = case when attempts >= max_attempts
      then 'dead_letter' else 'queued' end,
    lease_token = null, lease_expires_at = null, available_at = now()
  where status = 'leased' and lease_expires_at <= now();
  return query
  with candidates as (
    select r.ticket_id from public.expo_push_receipts r
    where r.status = 'queued' and r.available_at <= now()
      and r.attempts < r.max_attempts
    order by r.available_at limit least(greatest(batch_size, 0), 300)
    for update skip locked
  ), claimed as (
    update public.expo_push_receipts r set status = 'leased',
      attempts = r.attempts + 1, lease_token = extensions.gen_random_uuid(),
      lease_expires_at = now() + interval '5 minutes', updated_at = now()
    from candidates c where c.ticket_id = r.ticket_id
    returning r.ticket_id, r.push_token, r.lease_token
  ) select c.ticket_id, c.push_token, c.lease_token from claimed c;
end;
$$;

create or replace function public.complete_expo_push_receipt(
  target_ticket text, target_lease uuid, delivered boolean,
  permanent_failure boolean, result_provider_category text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare receipt public.expo_push_receipts;
begin
  select * into receipt from public.expo_push_receipts
  where ticket_id = target_ticket and status = 'leased'
    and lease_token = target_lease for update;
  if not found then return false; end if;
  if result_provider_category not in (
    'accepted', 'timeout', 'network', 'rate_limited', 'auth',
    'provider_error', 'malformed_response', 'permanent_destination'
  ) then raise exception 'Unsafe provider category' using errcode = 'check_violation'; end if;

  update public.notification_deliveries set
    status = (case when delivered then 'accepted' else 'failed' end)
      ::public.delivery_status,
    error_code = case when delivered then null else result_provider_category end
  where provider_id = target_ticket;
  if delivered then
    delete from public.expo_push_receipts where ticket_id = target_ticket;
  elsif permanent_failure then
    delete from public.push_tokens where token = receipt.push_token;
  elsif receipt.attempts >= receipt.max_attempts then
    update public.expo_push_receipts set status = 'dead_letter',
      provider_category = result_provider_category,
      lease_token = null, lease_expires_at = null, updated_at = now()
    where ticket_id = target_ticket;
  else
    update public.expo_push_receipts set status = 'queued',
      provider_category = result_provider_category,
      lease_token = null, lease_expires_at = null,
      available_at = now() + interval '15 minutes', updated_at = now()
    where ticket_id = target_ticket;
  end if;
  return true;
end;
$$;

-- -------------------------------------------------------------------------
-- Configurable quota observations and expanded operational alerts
-- -------------------------------------------------------------------------

create table public.resource_quota_status (
  id boolean primary key default true check (id),
  database_limit_bytes bigint check (database_limit_bytes > 0),
  storage_limit_bytes bigint check (storage_limit_bytes > 0),
  egress_limit_bytes bigint check (egress_limit_bytes > 0),
  storage_used_bytes bigint check (storage_used_bytes >= 0),
  egress_used_bytes bigint check (egress_used_bytes >= 0),
  sampled_at timestamptz not null default now()
);
alter table public.resource_quota_status enable row level security;
revoke all on public.resource_quota_status from anon, authenticated;

create or replace function public.record_resource_quota_status(
  database_limit_bytes bigint, storage_limit_bytes bigint,
  egress_limit_bytes bigint, storage_used_bytes bigint, egress_used_bytes bigint
)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.resource_quota_status (
    id, database_limit_bytes, storage_limit_bytes, egress_limit_bytes,
    storage_used_bytes, egress_used_bytes, sampled_at
  ) values (true, database_limit_bytes, storage_limit_bytes, egress_limit_bytes,
    storage_used_bytes, egress_used_bytes, now())
  on conflict (id) do update set
    database_limit_bytes = excluded.database_limit_bytes,
    storage_limit_bytes = excluded.storage_limit_bytes,
    egress_limit_bytes = excluded.egress_limit_bytes,
    storage_used_bytes = excluded.storage_used_bytes,
    egress_used_bytes = excluded.egress_used_bytes,
    sampled_at = now();
  return true;
end;
$$;

alter function public.refresh_operational_alerts() rename to refresh_operational_alerts_phase6;
create or replace function public.refresh_operational_alerts()
returns integer language plpgsql security definer set search_path = '' as $$
declare created integer := 0; changed integer;
begin
  created := public.refresh_operational_alerts_phase6();

  insert into public.operational_alerts (code, severity, message, entity_key)
  select 'worker_repeated_failures', 'critical',
    'A worker failed at least three times within one hour', 'worker:' || r.job
  from public.job_runs r where r.status in ('failed', 'dead_letter')
    and r.ran_at > now() - interval '1 hour'
  group by r.job having count(*) >= 3
  on conflict do nothing;
  get diagnostics changed = row_count; created := created + changed;

  insert into public.operational_alerts (code, severity, message, job_run_id, entity_key)
  select 'worker_dead_letter', 'critical',
    r.job || ' exhausted its retry budget', r.id, 'job:' || r.id::text
  from public.job_runs r where r.status = 'dead_letter'
  on conflict do nothing;
  get diagnostics changed = row_count; created := created + changed;

  insert into public.operational_alerts (code, severity, message, entity_key)
  select 'worker_queue_depth', 'warning',
    'A worker queue contains at least ten active runs', 'queue:' || r.job
  from public.job_runs r where r.status in ('queued', 'leased')
  group by r.job having count(*) >= 10
  on conflict do nothing;
  get diagnostics changed = row_count; created := created + changed;

  insert into public.operational_alerts (code, severity, message, entity_key)
  select 'provider_authentication', 'critical',
    'A provider rejected worker authentication', 'provider:' || r.job
  from public.job_runs r where r.provider_category = 'auth'
    and r.ran_at > now() - interval '1 day'
  group by r.job on conflict do nothing;
  get diagnostics changed = row_count; created := created + changed;

  insert into public.operational_alerts (code, severity, message, entity_key)
  select 'notification_delivery_collapse', 'critical',
    'At least 80 percent of recent notification attempts failed', 'notifications'
  from public.notification_deliveries n
  where n.attempted_at > now() - interval '1 hour'
  having count(*) >= 10 and count(*) filter (where n.status = 'failed') * 5 >= count(*) * 4
  on conflict do nothing;
  get diagnostics changed = row_count; created := created + changed;

  insert into public.operational_alerts (code, severity, message, entity_key)
  select 'translation_dead_letter', 'warning',
    'Translation items exhausted their retry budget', 'translation-dead-letter'
  where exists (select 1 from public.translation_failures where status = 'dead_letter')
  on conflict do nothing;
  get diagnostics changed = row_count; created := created + changed;

  insert into public.operational_alerts (code, severity, message, entity_key)
  select 'receipt_dead_letter', 'warning',
    'Expo receipt checks exhausted their retry budget', 'receipt-dead-letter'
  where exists (select 1 from public.expo_push_receipts where status = 'dead_letter')
  on conflict do nothing;
  get diagnostics changed = row_count; created := created + changed;

  insert into public.operational_alerts (code, severity, message, entity_key)
  select 'resource_quota_approaching', 'critical',
    'Database usage reached at least 80 percent of its configured quota', 'quota:database'
  from public.resource_quota_status q where q.database_limit_bytes is not null
    and pg_catalog.pg_database_size(current_database()) * 5 >= q.database_limit_bytes * 4
  on conflict do nothing;
  get diagnostics changed = row_count; created := created + changed;
  insert into public.operational_alerts (code, severity, message, entity_key)
  select 'resource_quota_approaching', 'critical',
    'Storage usage reached at least 80 percent of its configured quota', 'quota:storage'
  from public.resource_quota_status q where q.storage_limit_bytes is not null
    and q.storage_used_bytes * 5 >= q.storage_limit_bytes * 4
  on conflict do nothing;
  get diagnostics changed = row_count; created := created + changed;
  insert into public.operational_alerts (code, severity, message, entity_key)
  select 'resource_quota_approaching', 'critical',
    'Egress usage reached at least 80 percent of its configured quota', 'quota:egress'
  from public.resource_quota_status q where q.egress_limit_bytes is not null
    and q.egress_used_bytes * 5 >= q.egress_limit_bytes * 4
  on conflict do nothing;
  get diagnostics changed = row_count; created := created + changed;
  return created;
end;
$$;

revoke execute on function public.claim_worker_run(bigint, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.complete_worker_run(bigint, uuid, boolean, boolean, text, text)
  from public, anon, authenticated;
revoke execute on function public.recover_worker_runs() from public, anon, authenticated;
revoke execute on function public.retry_worker_runs() from public, anon, authenticated;
revoke execute on function public.record_translation_attempt(text, uuid, text, text, boolean, text)
  from public, anon, authenticated;
revoke execute on function public.enqueue_expo_push_receipt(text, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.claim_expo_push_receipts(integer)
  from public, anon, authenticated;
revoke execute on function public.complete_expo_push_receipt(text, uuid, boolean, boolean, text)
  from public, anon, authenticated;
revoke execute on function public.record_resource_quota_status(bigint, bigint, bigint, bigint, bigint)
  from public, anon, authenticated;
revoke execute on function public.refresh_operational_alerts_phase6()
  from public, anon, authenticated;
revoke execute on function public.refresh_operational_alerts()
  from public, anon, authenticated;
grant execute on function public.claim_worker_run(bigint, text, uuid) to service_role;
grant execute on function public.complete_worker_run(bigint, uuid, boolean, boolean, text, text) to service_role;
grant execute on function public.recover_worker_runs() to service_role;
grant execute on function public.retry_worker_runs() to service_role;
grant execute on function public.record_translation_attempt(text, uuid, text, text, boolean, text) to service_role;
grant execute on function public.enqueue_expo_push_receipt(text, text, uuid) to service_role;
grant execute on function public.claim_expo_push_receipts(integer) to service_role;
grant execute on function public.complete_expo_push_receipt(text, uuid, boolean, boolean, text) to service_role;
grant execute on function public.record_resource_quota_status(bigint, bigint, bigint, bigint, bigint) to service_role;
grant execute on function public.refresh_operational_alerts_phase6() to service_role;
grant execute on function public.refresh_operational_alerts() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname) from cron.job
      where jobname in ('unumae-worker-retries', 'unumae-process-push-receipts');
    perform cron.schedule('unumae-worker-retries', '*/5 * * * *',
      'select public.retry_worker_runs()');
    perform cron.schedule('unumae-process-push-receipts', '*/15 * * * *',
      $job$select public.invoke_function('process-push-receipts')$job$);
  end if;
exception when others then
  insert into public.job_runs (job, ok, status, detail, completed_at)
  values ('schedule-worker-reliability', false, 'failed', left(sqlerrm, 1000), now());
end;
$$;
