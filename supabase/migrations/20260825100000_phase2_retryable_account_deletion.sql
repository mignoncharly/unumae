-- Roadmap v2 Phase 2 -- complete, retryable account deletion and storage hygiene.
--
-- Account deletion is a state machine rather than a synchronous best effort.
-- The request transaction locks the account before any destructive work. A
-- leased service-role worker then removes storage, the public profile graph,
-- and finally the Auth user. Completed requests retain no user id.

create type public.deletion_request_state as enum (
  'requested',
  'account_locked',
  'storage_deleting',
  'database_deleting',
  'auth_deleting',
  'completed',
  'retryable_failure',
  'manual_review'
);

create table public.deletion_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  current_stage public.deletion_request_state not null default 'requested',
  resume_stage public.deletion_request_state,
  attempt_count integer not null default 0,
  last_error_code text,
  idempotency_key_hash text not null unique,
  correlation_id uuid not null default extensions.gen_random_uuid() unique,
  was_published boolean not null default false,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  avatar_objects_deleted integer not null default 0,
  portrait_objects_deleted integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint deletion_requests_attempts_nonnegative check (attempt_count >= 0),
  constraint deletion_requests_counts_nonnegative check (
    avatar_objects_deleted >= 0 and portrait_objects_deleted >= 0
  ),
  constraint deletion_requests_error_code_bounded check (
    last_error_code is null or char_length(last_error_code) <= 80
  ),
  constraint deletion_requests_resume_stage_valid check (
    (current_stage = 'retryable_failure' and resume_stage in (
      'storage_deleting', 'database_deleting', 'auth_deleting'
    )) or (current_stage <> 'retryable_failure' and resume_stage is null)
  ),
  constraint deletion_requests_completed_shape check (
    (current_stage = 'completed' and completed_at is not null and user_id is null)
    or (current_stage <> 'completed' and completed_at is null and user_id is not null)
  )
);

create unique index deletion_requests_one_open_per_user
  on public.deletion_requests (user_id)
  where user_id is not null and current_stage <> 'completed';
create index deletion_requests_worker_queue
  on public.deletion_requests (available_at, requested_at)
  where current_stage in ('account_locked', 'retryable_failure');

alter table public.deletion_requests enable row level security;
revoke all on public.deletion_requests from anon, authenticated;

-- Service credentials now exist in legacy JWT and new secret-key forms. Edge
-- workers use this harmless signed PostgREST probe instead of assuming the
-- scheduler credential is byte-identical to the runtime-injected key.
create or replace function public.service_role_probe()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select true $$;

revoke execute on function public.service_role_probe()
  from public, anon, authenticated;
grant execute on function public.service_role_probe() to service_role;

comment on table public.deletion_requests is
  'Retryable account-deletion state. Completed rows are anonymized; errors are stable codes, never provider responses.';
comment on column public.deletion_requests.idempotency_key_hash is
  'SHA-256 of the client idempotency key. The raw key is never persisted.';
comment on column public.deletion_requests.correlation_id is
  'Non-secret identifier a user may quote to support.';

-- The caller must have established a fresh Auth session. Token refresh does not
-- update auth.users.last_sign_in_at, so it cannot extend this window.
create or replace function public.has_recent_authentication(
  maximum_age interval default interval '15 minutes'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and u.last_sign_in_at >= now() - maximum_age
  );
$$;

create or replace function public.request_account_deletion(idempotency_key text)
returns table (
  request_id uuid,
  state public.deletion_request_state,
  correlation_id uuid,
  requested_at timestamptz,
  was_published boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  clean_key text := btrim(coalesce(idempotency_key, ''));
  key_hash text;
  prior_status_version bigint;
begin
  perform public.assert_authenticated();

  -- Repeated requests reuse the durable operation even after the account has
  -- entered deletion_pending and cannot perform ordinary mutations.
  return query
  select r.id, r.current_stage, r.correlation_id, r.requested_at, r.was_published
  from public.deletion_requests r
  where r.user_id = caller and r.current_stage <> 'completed'
  order by r.requested_at desc
  limit 1;
  if found then
    return;
  end if;

  if char_length(clean_key) < 16 or char_length(clean_key) > 128 then
    raise exception 'Invalid deletion idempotency key'
      using errcode = 'check_violation';
  end if;

  if not public.has_recent_authentication() then
    raise exception 'Recent authentication required'
      using errcode = 'insufficient_privilege';
  end if;

  select p.account_status_version
  into prior_status_version
  from public.profiles p
  where p.id = caller
  for update;

  key_hash := encode(extensions.digest(clean_key, 'sha256'), 'hex');

  insert into public.deletion_requests (
    user_id, current_stage, idempotency_key_hash, was_published
  ) values (
    caller,
    'requested',
    key_hash,
    exists (
      select 1 from public.daily_draws d
      where d.selected_user_id = caller and d.human_number is not null
    )
  )
  returning
    deletion_requests.id,
    deletion_requests.current_stage,
    deletion_requests.correlation_id,
    deletion_requests.requested_at,
    deletion_requests.was_published
  into request_id, state, correlation_id, requested_at, was_published;

  -- Lock before returning. Existing access JWTs can still read support/export
  -- surfaces, but Phase 1 database guards reject every participation mutation.
  if prior_status_version is not null then
    update public.profiles
    set account_status = 'deletion_pending',
        account_status_version = account_status_version + 1,
        selection_eligible = false,
        wants_selection = false
    where id = caller;

    delete from public.push_tokens where user_id = caller;

    insert into public.account_enforcement_jobs (
      user_id, target_status, status_version, idempotency_key
    ) values (
      caller,
      'deletion_pending',
      prior_status_version + 1,
      caller::text || ':' || (prior_status_version + 1)::text
    ) on conflict on constraint account_enforcement_jobs_user_id_status_version_key
      do nothing;
  end if;

  update public.deletion_requests r
  set current_stage = 'account_locked', updated_at = now()
  where r.id = request_id;
  state := 'account_locked';

  return next;
end;
$$;

create or replace function public.my_deletion_request()
returns table (
  state public.deletion_request_state,
  correlation_id uuid,
  requested_at timestamptz,
  completed_at timestamptz,
  was_published boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.current_stage, r.correlation_id, r.requested_at,
    r.completed_at, r.was_published
  from public.deletion_requests r
  where (select auth.uid()) is not null
    and r.user_id = (select auth.uid())
  limit 1;
$$;

revoke execute on function public.has_recent_authentication(interval)
  from public, anon;
revoke execute on function public.request_account_deletion(text)
  from public, anon;
revoke execute on function public.my_deletion_request()
  from public, anon;
grant execute on function public.has_recent_authentication(interval)
  to authenticated;
grant execute on function public.request_account_deletion(text)
  to authenticated;
grant execute on function public.my_deletion_request()
  to authenticated;

-- An Auth account may request deletion before onboarding creates a profile.
-- Once that request exists, the old insert policy must not let a stale JWT
-- recreate an active profile while the worker is deleting the Auth account.
create or replace function public.account_deletion_is_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.deletion_requests r
    where r.user_id = (select auth.uid())
      and r.current_stage <> 'completed'
  );
$$;

revoke execute on function public.account_deletion_is_open()
  from public, anon;
grant execute on function public.account_deletion_is_open()
  to authenticated;

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own_not_deleting
  on public.profiles for insert to authenticated
  with check (
    (select auth.uid()) = id
    and not public.account_deletion_is_open()
  );

-- ---------------------------------------------------------------------------
-- Privileged deletion worker state transitions
-- ---------------------------------------------------------------------------

create or replace function public.claim_account_deletion_requests(
  limit_rows integer default 5
)
returns table (
  request_id uuid,
  user_id uuid,
  stage public.deletion_request_state,
  correlation_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select r.id
    from public.deletion_requests r
    where r.current_stage in ('account_locked', 'retryable_failure')
      and r.attempt_count < 10
      and r.available_at <= now()
      and (r.locked_at is null or r.locked_at < now() - interval '5 minutes')
    order by r.requested_at
    for update skip locked
    limit greatest(least(limit_rows, 20), 0)
  )
  update public.deletion_requests r
  set current_stage = case
        when r.current_stage = 'account_locked'
          then 'storage_deleting'::public.deletion_request_state
        else r.resume_stage
      end,
      resume_stage = null,
      attempt_count = r.attempt_count + 1,
      locked_at = now(),
      last_error_code = null,
      updated_at = now()
  from candidates c
  where r.id = c.id
  returning r.id, r.user_id, r.current_stage, r.correlation_id;
end;
$$;

create or replace function public.advance_account_deletion(
  target_request uuid,
  expected_stage public.deletion_request_state,
  next_stage public.deletion_request_state,
  deleted_avatars integer default 0,
  deleted_portraits integer default 0
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (expected_stage, next_stage) not in (
    ('storage_deleting'::public.deletion_request_state,
      'database_deleting'::public.deletion_request_state),
    ('database_deleting'::public.deletion_request_state,
      'auth_deleting'::public.deletion_request_state)
  ) then
    raise exception 'Invalid deletion stage transition'
      using errcode = 'check_violation';
  end if;

  update public.deletion_requests r
  set current_stage = next_stage,
      avatar_objects_deleted = r.avatar_objects_deleted
        + greatest(deleted_avatars, 0),
      portrait_objects_deleted = r.portrait_objects_deleted
        + greatest(deleted_portraits, 0),
      updated_at = now()
  where r.id = target_request
    and r.current_stage = expected_stage
    and r.locked_at is not null;
  return found;
end;
$$;

create or replace function public.delete_account_database_records(
  target_request uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
begin
  select r.user_id into target_user
  from public.deletion_requests r
  where r.id = target_request
    and r.current_stage = 'database_deleting'
    and r.locked_at is not null
  for update;

  if target_user is null then
    return false;
  end if;

  -- CASCADE removes owned private records. SET NULL intentionally anonymizes
  -- draw, report, appeal, analytics, and moderation audit records.
  -- Cleanup jobs contain the user UUID inside their object path, so remove
  -- them in the same transaction instead of retaining a private identifier
  -- after the corresponding objects were already verified absent.
  delete from public.storage_cleanup_jobs j
  where split_part(j.object_name, '/', 1) = target_user::text;

  delete from public.profiles p where p.id = target_user;

  update public.deletion_requests
  set current_stage = 'auth_deleting', updated_at = now()
  where id = target_request and current_stage = 'database_deleting';
  return found;
end;
$$;

create or replace function public.complete_account_deletion(
  target_request uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
begin
  select r.user_id into target_user
  from public.deletion_requests r
  where r.id = target_request and r.current_stage = 'auth_deleting'
  for update;

  if target_user is null or exists (
    select 1 from auth.users u where u.id = target_user
  ) then
    return false;
  end if;

  update public.deletion_requests
  set current_stage = 'completed',
      user_id = null,
      completed_at = now(),
      locked_at = null,
      resume_stage = null,
      last_error_code = null,
      updated_at = now()
  where id = target_request and current_stage = 'auth_deleting';
  return found;
end;
$$;

create or replace function public.fail_account_deletion(
  target_request uuid,
  error_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  failed_stage public.deletion_request_state;
  attempts integer;
begin
  select r.current_stage, r.attempt_count
  into failed_stage, attempts
  from public.deletion_requests r
  where r.id = target_request
    and r.current_stage in (
      'storage_deleting', 'database_deleting', 'auth_deleting'
    )
  for update;

  if not found then
    return false;
  end if;

  update public.deletion_requests
  set current_stage = case when attempts >= 10
        then 'manual_review'::public.deletion_request_state
        else 'retryable_failure'::public.deletion_request_state
      end,
      resume_stage = case when attempts >= 10 then null else failed_stage end,
      available_at = now() + make_interval(
        secs => least(900, greatest(5, (2 ^ least(attempts, 9))::integer))
      ),
      locked_at = null,
      last_error_code = left(
        coalesce(nullif(btrim(error_code), ''), 'deletion_stage_failed'), 80
      ),
      updated_at = now()
  where id = target_request;
  return true;
end;
$$;

revoke execute on function public.claim_account_deletion_requests(integer)
  from public, anon, authenticated;
revoke execute on function public.advance_account_deletion(
  uuid, public.deletion_request_state, public.deletion_request_state,
  integer, integer
) from public, anon, authenticated;
revoke execute on function public.delete_account_database_records(uuid)
  from public, anon, authenticated;
revoke execute on function public.complete_account_deletion(uuid)
  from public, anon, authenticated;
revoke execute on function public.fail_account_deletion(uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_account_deletion_requests(integer)
  to service_role;
grant execute on function public.advance_account_deletion(
  uuid, public.deletion_request_state, public.deletion_request_state,
  integer, integer
) to service_role;
grant execute on function public.delete_account_database_records(uuid)
  to service_role;
grant execute on function public.complete_account_deletion(uuid)
  to service_role;
grant execute on function public.fail_account_deletion(uuid, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Versioned uploads and a durable orphan/replacement cleanup queue
-- ---------------------------------------------------------------------------

create table public.storage_cleanup_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  bucket_id text not null check (bucket_id in ('avatars', 'portraits')),
  object_name text not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  manual_review_at timestamptz,
  last_error_code text check (
    last_error_code is null or char_length(last_error_code) <= 80
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_id, object_name)
);

create index storage_cleanup_jobs_pending
  on public.storage_cleanup_jobs (available_at, created_at)
  where manual_review_at is null;
alter table public.storage_cleanup_jobs enable row level security;
revoke all on public.storage_cleanup_jobs from anon, authenticated;

create or replace function public.can_insert_owned_storage_object(
  target_bucket text,
  object_name text,
  object_metadata jsonb
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_account_status() = 'active'
    and target_bucket in ('avatars', 'portraits')
    and split_part(object_name, '/', 1) = (select auth.uid())::text
    and object_name ~ case target_bucket
      when 'portraits' then
        ('^' || (select auth.uid())::text
          || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
          || '/photo/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$')
      else
        ('^' || (select auth.uid())::text
          || '/avatar/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$')
      end
    and lower(coalesce(object_metadata ->> 'mimetype', '')) = 'image/jpeg'
    and coalesce((object_metadata ->> 'size')::bigint, 0) between 1 and 8388608
    and (
      select count(*) from storage.objects o
      where o.bucket_id = target_bucket
        and split_part(o.name, '/', 1) = (select auth.uid())::text
    ) < 10;
$$;

drop policy if exists storage_avatars_own on storage.objects;
drop policy if exists storage_portraits_own on storage.objects;

create policy storage_avatars_own_read_delete
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_account_status() = 'active'
  );
create policy storage_avatars_own_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_account_status() = 'active'
  );
create policy storage_avatars_valid_insert
  on storage.objects for insert to authenticated
  with check (public.can_insert_owned_storage_object(bucket_id, name, metadata));

create policy storage_portraits_own_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'portraits'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_account_status() = 'active'
  );
create policy storage_portraits_own_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portraits'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_account_status() = 'active'
  );
create policy storage_portraits_valid_insert
  on storage.objects for insert to authenticated
  with check (public.can_insert_owned_storage_object(bucket_id, name, metadata));

revoke execute on function public.can_insert_owned_storage_object(text, text, jsonb)
  from public, anon;
grant execute on function public.can_insert_owned_storage_object(text, text, jsonb)
  to authenticated;

create or replace function public.register_validated_portrait_photo(
  target_user uuid,
  target_portrait uuid,
  object_name text,
  object_size bigint
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_path text;
  expected_prefix text := target_user::text || '/' || target_portrait::text || '/photo/';
begin
  if object_size < 1 or object_size > 8388608
     or left(object_name, char_length(expected_prefix)) <> expected_prefix
     or object_name !~ '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$' then
    raise exception 'Invalid portrait object path or size'
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = target_user and p.account_status = 'active'
  ) then
    raise exception 'Active account required'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'portraits'
      and o.name = object_name
      and lower(coalesce(o.metadata ->> 'mimetype', '')) = 'image/jpeg'
      and coalesce((o.metadata ->> 'size')::bigint, 0) = object_size
  ) then
    raise exception 'Uploaded portrait object does not match registration'
      using errcode = 'foreign_key_violation';
  end if;

  select p.photo_path into previous_path
  from public.portraits p
  where p.id = target_portrait
    and p.user_id = target_user
    and p.status = 'draft'
  for update;

  if not found then
    raise exception 'Editable portrait does not exist'
      using errcode = 'insufficient_privilege';
  end if;

  update public.portraits set photo_path = object_name
  where id = target_portrait;

  if previous_path is not null and previous_path <> object_name then
    insert into public.storage_cleanup_jobs (bucket_id, object_name)
    values ('portraits', previous_path)
    on conflict on constraint storage_cleanup_jobs_bucket_id_object_name_key do update
      set available_at = least(storage_cleanup_jobs.available_at, now()),
          manual_review_at = null,
          updated_at = now();
  end if;

  return object_name;
end;
$$;

create or replace function public.enqueue_orphan_storage_objects(
  limit_rows integer default 200
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued integer;
begin
  with orphaned as (
    select o.bucket_id, o.name
    from storage.objects o
    where o.bucket_id in ('avatars', 'portraits')
      and o.created_at < now() - interval '1 hour'
      and (
        (o.bucket_id = 'avatars' and not exists (
          select 1 from public.profiles p where p.avatar_path = o.name
        ))
        or
        (o.bucket_id = 'portraits' and not exists (
          select 1 from public.portraits p
          where p.photo_path = o.name or p.media_path = o.name
        ))
      )
    order by o.created_at
    limit greatest(least(limit_rows, 1000), 0)
  )
  insert into public.storage_cleanup_jobs (bucket_id, object_name)
  select bucket_id, name from orphaned
  on conflict (bucket_id, object_name) do nothing;
  get diagnostics queued = row_count;
  return queued;
end;
$$;

create or replace function public.claim_storage_cleanup_jobs(
  limit_rows integer default 100
)
returns table (job_id uuid, bucket_id text, object_name text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select j.id
    from public.storage_cleanup_jobs j
    where j.manual_review_at is null
      and j.attempt_count < 10
      and j.available_at <= now()
      and (j.locked_at is null or j.locked_at < now() - interval '5 minutes')
    order by j.created_at
    for update skip locked
    limit greatest(least(limit_rows, 200), 0)
  )
  update public.storage_cleanup_jobs j
  set attempt_count = j.attempt_count + 1,
      locked_at = now(),
      updated_at = now()
  from candidates c
  where j.id = c.id
  returning j.id, j.bucket_id, j.object_name;
end;
$$;

create or replace function public.complete_storage_cleanup_job(target_job uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.storage_cleanup_jobs where id = target_job;
  return found;
end;
$$;

create or replace function public.fail_storage_cleanup_job(
  target_job uuid,
  error_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.storage_cleanup_jobs j
  set locked_at = null,
      available_at = now() + make_interval(
        secs => least(900, greatest(5, (2 ^ least(j.attempt_count, 9))::integer))
      ),
      manual_review_at = case when j.attempt_count >= 10 then now() end,
      last_error_code = left(
        coalesce(nullif(btrim(error_code), ''), 'storage_cleanup_failed'), 80
      ),
      updated_at = now()
  where j.id = target_job;
  return found;
end;
$$;

revoke execute on function public.register_validated_portrait_photo(
  uuid, uuid, text, bigint
) from public, anon, authenticated;
revoke execute on function public.enqueue_orphan_storage_objects(integer)
  from public, anon, authenticated;
revoke execute on function public.claim_storage_cleanup_jobs(integer)
  from public, anon, authenticated;
revoke execute on function public.complete_storage_cleanup_job(uuid)
  from public, anon, authenticated;
revoke execute on function public.fail_storage_cleanup_job(uuid, text)
  from public, anon, authenticated;
grant execute on function public.register_validated_portrait_photo(
  uuid, uuid, text, bigint
) to service_role;
grant execute on function public.enqueue_orphan_storage_objects(integer)
  to service_role;
grant execute on function public.claim_storage_cleanup_jobs(integer)
  to service_role;
grant execute on function public.complete_storage_cleanup_job(uuid)
  to service_role;
grant execute on function public.fail_storage_cleanup_job(uuid, text)
  to service_role;

-- The deletion worker is frequent because an account is already locked. The
-- orphan reconciler is deliberately slower and ignores objects younger than an
-- hour so it cannot race an upload being registered.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname) from cron.job
      where jobname in ('unumae-account-deletion', 'unumae-storage-reconcile');
    perform cron.schedule(
      'unumae-account-deletion', '* * * * *',
      'select public.invoke_function(''process-account-deletions'')'
    );
    perform cron.schedule(
      'unumae-storage-reconcile', '*/15 * * * *',
      'select public.invoke_function(''reconcile-storage'')'
    );
  end if;
exception
  when others then
    raise notice 'Could not schedule Phase 2 workers: %', sqlerrm;
end;
$$;
