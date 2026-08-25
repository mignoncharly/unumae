-- Roadmap v2 Phase 6 — abuse resistance and data integrity.

-- -------------------------------------------------------------------------
-- Attestation-backed installation sessions and short-lived rate counters
-- -------------------------------------------------------------------------

create table public.installation_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_attestation_id uuid not null unique
    references public.account_device_attestations (id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint installation_session_hash_length check (octet_length(token_hash) = 32),
  constraint installation_session_lifetime check (
    expires_at > created_at and expires_at <= created_at + interval '31 days'
  )
);

create index idx_installation_sessions_user
  on public.installation_sessions (user_id, expires_at desc);

create table public.abuse_rate_limits (
  scope text not null,
  key_hash bytea not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  primary key (scope, key_hash, window_started_at),
  constraint abuse_rate_scope_bounded check (char_length(scope) between 1 and 80),
  constraint abuse_rate_hash_length check (octet_length(key_hash) = 32),
  constraint abuse_rate_count_positive check (request_count > 0)
);

alter table public.installation_sessions enable row level security;
alter table public.abuse_rate_limits enable row level security;
revoke all on public.installation_sessions from anon, authenticated;
revoke all on public.abuse_rate_limits from anon, authenticated;

create or replace function public.create_attested_installation_session(
  target_user uuid,
  target_attestation uuid,
  target_token_hash bytea,
  target_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_id uuid;
begin
  if octet_length(target_token_hash) <> 32
     or target_expires_at <= now()
     or target_expires_at > now() + interval '31 days'
     or not exists (
       select 1 from public.account_device_attestations a
       where a.id = target_attestation
         and a.user_id = target_user
         and a.state = 'verified'
     ) then
    raise exception 'A verified device attestation is required'
      using errcode = 'check_violation';
  end if;

  insert into public.installation_sessions (
    user_id, device_attestation_id, token_hash, expires_at
  ) values (
    target_user, target_attestation, target_token_hash, target_expires_at
  )
  on conflict (device_attestation_id) do update set
    token_hash = excluded.token_hash,
    expires_at = excluded.expires_at,
    revoked_at = null,
    last_seen_at = now()
  returning id into session_id;

  return session_id;
end;
$$;

create or replace function public.consume_abuse_rate_limit(
  target_scope text,
  target_key_hash bytea,
  maximum_requests integer,
  window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  bucket timestamptz;
  next_count integer;
begin
  if char_length(target_scope) not between 1 and 80
     or octet_length(target_key_hash) <> 32
     or maximum_requests not between 1 and 100000
     or window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate-limit parameters' using errcode = 'check_violation';
  end if;

  bucket := to_timestamp(
    floor(extract(epoch from now()) / window_seconds) * window_seconds
  );
  insert into public.abuse_rate_limits (
    scope, key_hash, window_started_at, request_count
  ) values (target_scope, target_key_hash, bucket, 1)
  on conflict (scope, key_hash, window_started_at) do update
    set request_count = public.abuse_rate_limits.request_count + 1
  returning request_count into next_count;
  return next_count <= maximum_requests;
end;
$$;

create or replace function public.authorize_installation_request(
  target_user uuid,
  target_session_hash bytea,
  target_scope text,
  maximum_requests integer,
  window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.installation_sessions s
    join public.account_device_attestations a on a.id = s.device_attestation_id
    where s.user_id = target_user and s.token_hash = target_session_hash
      and s.revoked_at is null and s.expires_at > now() and a.state = 'verified'
  ) then
    return false;
  end if;
  update public.installation_sessions set last_seen_at = now()
  where user_id = target_user and token_hash = target_session_hash;
  return public.consume_abuse_rate_limit(
    target_scope, target_session_hash, maximum_requests, window_seconds
  );
end;
$$;

-- -------------------------------------------------------------------------
-- Valid reports only, one open report per reporter/target, bounded per user
-- -------------------------------------------------------------------------

with duplicates as (
  select id, row_number() over (
    partition by reporter_id, target_type, target_id order by created_at, id
  ) as ordinal
  from public.content_reports
  where status = 'open' and reporter_id is not null
)
update public.content_reports r
set status = 'dismissed', resolved_at = now(),
    resolution_note = 'Closed while enforcing one open report per target.'
from duplicates d where d.id = r.id and d.ordinal > 1;

create unique index idx_content_reports_one_open_per_reporter_target
  on public.content_reports (reporter_id, target_type, target_id)
  where status = 'open' and reporter_id is not null;

create or replace function public.report_content(
  report_target_type public.report_target,
  report_target_id uuid,
  report_reason public.report_reason,
  report_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  target_owner uuid;
  recent_hour integer;
  recent_day integer;
  new_report uuid;
begin
  perform public.assert_account_active();

  target_owner := case report_target_type
    when 'profile' then (
      select p.id from public.profiles p where p.id = report_target_id
    )
    when 'portrait' then (
      select p.user_id from public.portraits p
      join public.daily_draws d on d.id = p.draw_id
      where p.id = report_target_id and p.status = 'approved'
        and d.selection_status in ('live', 'completed') and d.redacted_at is null
    )
    when 'question' then (
      select q.author_id from public.questions q
      join public.daily_draws d on d.id = q.draw_id
      where q.id = report_target_id and q.status = 'approved'
        and d.selection_status in ('live', 'completed') and d.redacted_at is null
    )
  end;

  if target_owner is null or target_owner = caller then
    raise exception 'Report target is invalid or unavailable'
      using errcode = 'check_violation';
  end if;

  select count(*) filter (where created_at > now() - interval '1 hour'),
         count(*) filter (where created_at > now() - interval '1 day')
  into recent_hour, recent_day
  from public.content_reports where reporter_id = caller;
  if recent_hour >= 10 or recent_day >= 30 then
    raise exception 'Report rate limit exceeded' using errcode = 'check_violation';
  end if;

  insert into public.content_reports (
    reporter_id, target_type, target_id, reason, note
  ) values (
    caller, report_target_type, report_target_id, report_reason,
    nullif(btrim(coalesce(report_note, '')), '')
  )
  on conflict (reporter_id, target_type, target_id)
    where status = 'open' and reporter_id is not null
  do nothing
  returning id into new_report;

  if new_report is null then
    raise exception 'An open report already exists for this target'
      using errcode = 'unique_violation';
  end if;
  return new_report;
end;
$$;

-- -------------------------------------------------------------------------
-- Push destinations: strict format, bounded ownership, one per attested session
-- -------------------------------------------------------------------------

alter table public.push_tokens
  add column installation_session_id uuid
    references public.installation_sessions (id) on delete set null;

create unique index idx_push_tokens_one_per_installation
  on public.push_tokens (installation_session_id)
  where installation_session_id is not null;

create or replace function public.register_push_token(
  push_token text,
  device_platform public.push_platform,
  installation_token text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  session_id uuid;
  previous_user uuid;
  token_hash bytea;
  active_tokens integer;
begin
  perform public.assert_account_active();
  if char_length(push_token) not between 20 and 200
     or push_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{1,180}\]$'
     or char_length(installation_token) not between 32 and 128 then
    raise exception 'Invalid push or installation token' using errcode = 'check_violation';
  end if;

  select s.id into session_id
  from public.installation_sessions s
  join public.account_device_attestations a on a.id = s.device_attestation_id
  where s.user_id = caller
    and s.token_hash = extensions.digest(installation_token, 'sha256')
    and s.revoked_at is null and s.expires_at > now()
    and a.state = 'verified';
  if session_id is null then
    raise exception 'A live attested installation session is required'
      using errcode = 'insufficient_privilege';
  end if;

  select t.user_id into previous_user from public.push_tokens t
  where t.token = push_token;
  if previous_user is distinct from caller and previous_user is not null then
    token_hash := extensions.digest(push_token, 'sha256');
    perform public.raise_account_signal(
      previous_user, 'shared_push_token', token_hash,
      'A push destination was presented by another account; ownership was not moved.'
    );
    perform public.raise_account_signal(
      caller, 'shared_push_token', token_hash,
      'A push destination belongs to another account; manual review required.'
    );
    return false;
  end if;

  delete from public.push_tokens t
  where t.installation_session_id = session_id and t.token <> push_token;
  select count(*) into active_tokens from public.push_tokens t
  join public.installation_sessions s on s.id = t.installation_session_id
  where t.user_id = caller and t.token <> push_token
    and s.revoked_at is null and s.expires_at > now();
  if active_tokens >= 3 then
    raise exception 'Push token limit exceeded' using errcode = 'check_violation';
  end if;

  insert into public.push_tokens (
    token, user_id, platform, installation_session_id
  ) values (push_token, caller, device_platform, session_id)
  on conflict (token) do update set
    platform = excluded.platform,
    installation_session_id = excluded.installation_session_id,
    last_seen_at = now()
  where public.push_tokens.user_id = excluded.user_id;

  insert into public.notification_settings (user_id) values (caller)
  on conflict (user_id) do nothing;
  return true;
end;
$$;

revoke execute on function public.register_push_token(
  text, public.push_platform
) from public, anon, authenticated;
revoke execute on function public.register_push_token(
  text, public.push_platform, text
) from public, anon;
grant execute on function public.register_push_token(
  text, public.push_platform, text
) to authenticated;

-- -------------------------------------------------------------------------
-- Analytics ingestion: service-only, attested session or identifier-free web
-- -------------------------------------------------------------------------

alter type public.analytics_event add value if not exists 'selection_explainer_opened';
alter type public.analytics_event add value if not exists 'mission_opened';

create or replace function public.ingest_analytics_events(
  target_session_hash bytea,
  target_network_hash bytea,
  batch jsonb,
  marketing_only boolean default false
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.installation_sessions;
  item jsonb;
  total integer;
  invalid integer := 0;
  inserted integer := 0;
  event_name text;
  event_properties jsonb;
  event_install uuid;
  event_user uuid;
begin
  if jsonb_typeof(batch) <> 'array' then
    raise exception 'Analytics batch must be an array' using errcode = 'check_violation';
  end if;
  total := jsonb_array_length(batch);
  if total < 1 or total > 20 or pg_column_size(batch) > 16384
     or octet_length(target_network_hash) <> 32 then
    raise exception 'Analytics batch exceeds its boundary' using errcode = 'check_violation';
  end if;

  if not public.consume_abuse_rate_limit(
    case when marketing_only then 'analytics-web-network-minute'
      else 'analytics-app-network-minute' end,
    target_network_hash, case when marketing_only then 30 else 120 end, 60
  ) then
    raise exception 'Analytics network rate limit exceeded' using errcode = 'check_violation';
  end if;

  if marketing_only then
    event_install := extensions.gen_random_uuid();
  else
    select s.* into session_row from public.installation_sessions s
    join public.account_device_attestations a on a.id = s.device_attestation_id
    where s.token_hash = target_session_hash and s.revoked_at is null
      and s.expires_at > now() and a.state = 'verified'
    for update of s;
    if not found then
      raise exception 'Installation session is invalid or expired'
        using errcode = 'insufficient_privilege';
    end if;
    if not public.consume_abuse_rate_limit(
      'analytics-installation-minute', target_session_hash, 60, 60
    ) or not public.consume_abuse_rate_limit(
      'analytics-installation-day', target_session_hash, 1000, 86400
    ) then
      raise exception 'Analytics installation rate limit exceeded'
        using errcode = 'check_violation';
    end if;
    event_install := session_row.id;
    event_user := session_row.user_id;
    update public.installation_sessions set last_seen_at = now()
    where id = session_row.id;
  end if;

  for item in select value from jsonb_array_elements(batch) loop
    event_name := item ->> 'event';
    event_properties := coalesce(item -> 'properties', '{}'::jsonb);
    if jsonb_typeof(item) <> 'object'
       or jsonb_typeof(event_properties) <> 'object'
       or pg_column_size(event_properties) > 1024
       or event_name is null
       or not (event_name = any (
         select unnest(enum_range(null::public.analytics_event))::text
       ))
       or (marketing_only and event_name not in (
         'selection_explainer_opened', 'archive_opened', 'mission_opened'
       )) then
      invalid := invalid + 1;
    end if;
  end loop;
  if invalid > 0 and invalid * 5 > total then
    raise exception 'Analytics invalid-event ratio exceeded'
      using errcode = 'check_violation';
  end if;

  insert into public.analytics_events (user_id, install_id, event, properties)
  select event_user, case when marketing_only then extensions.gen_random_uuid()
      else event_install end,
    (value ->> 'event')::public.analytics_event,
    coalesce(value -> 'properties', '{}'::jsonb)
  from jsonb_array_elements(batch)
  where jsonb_typeof(value) = 'object'
    and jsonb_typeof(coalesce(value -> 'properties', '{}'::jsonb)) = 'object'
    and pg_column_size(coalesce(value -> 'properties', '{}'::jsonb)) <= 1024
    and value ->> 'event' = any (
      select unnest(enum_range(null::public.analytics_event))::text
    )
    and (not marketing_only or value ->> 'event' in (
      'selection_explainer_opened', 'archive_opened', 'mission_opened'
    ))
  on conflict do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke execute on function public.track_events(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function public.ingest_analytics_events(
  bytea, bytea, jsonb, boolean
) from public, anon, authenticated;
grant execute on function public.ingest_analytics_events(
  bytea, bytea, jsonb, boolean
) to service_role;

-- -------------------------------------------------------------------------
-- Quota-protecting retention
-- -------------------------------------------------------------------------

create or replace function public.purge_phase6_operational_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  deliveries integer;
  notification_history integer;
  dismissed_reports integer;
  sessions integer;
  counters integer;
  challenges integer;
  stale_push_tokens integer;
begin
  delete from public.notification_deliveries where attempted_at < now() - interval '90 days';
  get diagnostics deliveries = row_count;
  delete from public.notification_log where sent_at < now() - interval '365 days';
  get diagnostics notification_history = row_count;
  delete from public.content_reports
  where status = 'dismissed' and resolved_at < now() - interval '365 days';
  get diagnostics dismissed_reports = row_count;
  delete from public.push_tokens t using public.installation_sessions s
  where t.installation_session_id = s.id
    and (s.expires_at < now() or s.revoked_at is not null);
  get diagnostics stale_push_tokens = row_count;
  delete from public.installation_sessions
  where expires_at < now() - interval '1 day' or revoked_at < now() - interval '1 day';
  get diagnostics sessions = row_count;
  delete from public.abuse_rate_limits where window_started_at < now() - interval '2 days';
  get diagnostics counters = row_count;
  delete from public.attestation_challenges
  where expires_at < now() - interval '1 day' or consumed_at < now() - interval '1 day';
  get diagnostics challenges = row_count;
  return jsonb_build_object(
    'notification_deliveries', deliveries,
    'notification_log', notification_history,
    'dismissed_reports', dismissed_reports,
    'installation_sessions', sessions,
    'stale_push_tokens', stale_push_tokens,
    'rate_counters', counters,
    'attestation_challenges', challenges
  );
end;
$$;

revoke execute on function public.create_attested_installation_session(
  uuid, uuid, bytea, timestamptz
) from public, anon, authenticated;
revoke execute on function public.consume_abuse_rate_limit(
  text, bytea, integer, integer
) from public, anon, authenticated;
revoke execute on function public.purge_phase6_operational_data()
  from public, anon, authenticated;
grant execute on function public.create_attested_installation_session(
  uuid, uuid, bytea, timestamptz
) to service_role;
grant execute on function public.consume_abuse_rate_limit(
  text, bytea, integer, integer
) to service_role;
revoke execute on function public.authorize_installation_request(
  uuid, bytea, text, integer, integer
) from public, anon, authenticated;
grant execute on function public.authorize_installation_request(
  uuid, bytea, text, integer, integer
) to service_role;
grant execute on function public.purge_phase6_operational_data() to service_role;

-- Add the new personal session metadata without exposing its bearer token.
alter function public.export_my_data() rename to export_my_data_phase5;
revoke execute on function public.export_my_data_phase5()
  from public, anon, authenticated;

create or replace function public.export_my_data()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  subject uuid := (select auth.uid());
  payload jsonb;
  maximum_bytes constant integer := 5 * 1024 * 1024;
begin
  payload := public.export_my_data_phase5()::jsonb || jsonb_build_object(
    'installation_sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'platform', a.platform,
        'expires_at', s.expires_at,
        'last_seen_at', s.last_seen_at,
        'revoked_at', s.revoked_at,
        'created_at', s.created_at,
        'token_withheld', true
      ) order by s.created_at)
      from public.installation_sessions s
      join public.account_device_attestations a on a.id = s.device_attestation_id
      where s.user_id = subject
    ), '[]'::jsonb)
  );
  if pg_column_size(payload) > maximum_bytes then
    raise exception 'Personal data export exceeds the 5 MiB synchronous limit'
      using errcode = 'program_limit_exceeded';
  end if;
  return payload::json;
end;
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

comment on column public.analytics_events.install_id is
  'Server-issued attested installation session UUID for app events; a fresh non-linkable UUID for each website event.';

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname) from cron.job
    where jobname = 'onehuman-phase6-retention';
    perform cron.schedule(
      'onehuman-phase6-retention', '45 3 * * *',
      'select public.purge_phase6_operational_data()'
    );
  end if;
exception when others then
  raise notice 'Could not schedule Phase 6 retention: %', sqlerrm;
end;
$$;
