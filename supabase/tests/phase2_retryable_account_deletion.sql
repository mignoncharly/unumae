begin;

create extension if not exists pgtap with schema extensions;
select plan(71);

select has_table('public', 'deletion_requests', 'deletion state table exists');
select has_type('public', 'deletion_request_state', 'deletion state enum exists');
select has_function(
  'public', 'request_account_deletion', array['text'],
  'lock-first deletion request RPC exists'
);
select is(
  has_table_privilege('authenticated', 'public.deletion_requests', 'select'),
  false,
  'clients cannot read the worker table directly'
);
select is(
  has_function_privilege(
    'authenticated', 'public.claim_account_deletion_requests(integer)', 'execute'
  ),
  false,
  'authenticated users cannot claim deletion work'
);
select is(
  has_function_privilege(
    'service_role', 'public.claim_account_deletion_requests(integer)', 'execute'
  ),
  true,
  'service role can claim deletion work'
);
select is(
  has_function_privilege(
    'authenticated', 'public.service_role_probe()', 'execute'
  ),
  false,
  'normal JWT cannot use the worker credential probe'
);
select is(
  has_function_privilege('service_role', 'public.service_role_probe()', 'execute'),
  true,
  'service credential can pass the signed worker probe'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, last_sign_in_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'delete-now@example.test', '',
    now(), now(), '{"provider":"email","providers":["email"]}', '{}',
    now(), now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'delete-old@example.test', '',
    now(), now() - interval '1 hour',
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'upload@example.test', '',
    now(), now(), '{"provider":"email","providers":["email"]}', '{}',
    now(), now()
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'profileless@example.test', '',
    now(), now(), '{"provider":"email","providers":["email"]}', '{}',
    now(), now()
  );

insert into public.profiles (
  id, username, display_name, birth_year, country_code,
  wants_selection, selection_eligible, locale
) values
  (
    '10000000-0000-0000-0000-000000000001', 'delete_now',
    'Delete Now', 1990, 'DE', true, true, 'en'
  ),
  (
    '10000000-0000-0000-0000-000000000002', 'delete_old',
    'Delete Old', 1990, 'DE', true, true, 'en'
  ),
  (
    '10000000-0000-0000-0000-000000000003', 'upload_user',
    'Upload User', 1990, 'DE', false, false, 'en'
  );

insert into public.daily_draws (
  id, selection_date, candidate_pool_hash, candidate_count, random_seed,
  selected_user_id, selection_status, human_number, published_at
) values (
  '10000000-0000-0000-0000-000000000010', current_date - 10,
  repeat('a', 64), 1, repeat('b', 64),
  '10000000-0000-0000-0000-000000000001', 'completed', 501, now()
);
insert into public.questions (id, draw_id, author_id, body)
values (
  '10000000-0000-0000-0000-000000000011',
  '10000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000001',
  'Deletion cascade fixture?'
);
insert into public.analytics_events (user_id, install_id, event)
values (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000012', 'app_opened'
);
insert into public.moderation_events (action, subject_id, reason)
values (
  'auto_flagged', '10000000-0000-0000-0000-000000000001',
  'Anonymized deletion audit fixture'
);
insert into public.push_tokens (user_id, token, platform)
values (
  '10000000-0000-0000-0000-000000000001',
  'ExponentPushToken[phase2-delete]', 'ios'
);
insert into public.storage_cleanup_jobs (bucket_id, object_name)
values (
  'portraits',
  '10000000-0000-0000-0000-000000000001/queued/private-object.jpg'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001', true
);
set local role authenticated;

select ok(public.has_recent_authentication(), 'fresh session passes recent-auth check');
create temp table first_request as
select * from public.request_account_deletion(
  '11111111-1111-4111-8111-111111111111'
);
select is(
  (select state from first_request),
  'account_locked'::public.deletion_request_state,
  'request returns only after the account is locked'
);
select ok(
  (select correlation_id is not null from first_request),
  'request returns a support correlation id'
);

reset role;
grant select on first_request to service_role;
select is(
  (select account_status from public.profiles
   where id = '10000000-0000-0000-0000-000000000001'),
  'deletion_pending'::public.account_status,
  'account enters deletion_pending before asynchronous work'
);
select is(
  (select wants_selection from public.profiles
   where id = '10000000-0000-0000-0000-000000000001'),
  false,
  'deletion immediately opts the account out of selection'
);
select is(
  (select selection_eligible from public.profiles
   where id = '10000000-0000-0000-0000-000000000001'),
  false,
  'deletion immediately removes eligibility'
);
select is(
  (select count(*)::integer from public.push_tokens
   where user_id = '10000000-0000-0000-0000-000000000001'),
  0,
  'notification tokens are removed in the lock transaction'
);
select is(
  (select count(*)::integer from public.account_enforcement_jobs
   where user_id = '10000000-0000-0000-0000-000000000001'
     and target_status = 'deletion_pending'),
  1,
  'lock transaction also queues session revocation'
);
select isnt(
  (select idempotency_key_hash from public.deletion_requests
   where user_id = '10000000-0000-0000-0000-000000000001'),
  '11111111-1111-4111-8111-111111111111',
  'raw idempotency key is not stored'
);
select is(
  (select was_published from public.deletion_requests
   where user_id = '10000000-0000-0000-0000-000000000001'),
  true,
  'published-archive existence is captured before deletion'
);

set local role authenticated;
create temp table repeated_request as
select * from public.request_account_deletion(
  '22222222-2222-4222-8222-222222222222'
);
select is(
  (select request_id from repeated_request),
  (select request_id from first_request),
  'duplicate deletion request reuses the operation'
);
reset role;
select is(
  (select count(*)::integer from public.deletion_requests
   where user_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'duplicate request does not create another job'
);

set local role authenticated;
select throws_ok(
  'select public.accept_community_rules()', '42501',
  'Active account required',
  'direct participation RPC is blocked after deletion begins'
);
select lives_ok(
  'select public.export_my_data()',
  'personal export remains available while deletion is pending'
);
reset role;

set local role service_role;
create temp table first_claim as
select * from public.claim_account_deletion_requests(5);
select is(
  (select stage from first_claim
   where user_id = '10000000-0000-0000-0000-000000000001'),
  'storage_deleting'::public.deletion_request_state,
  'worker begins with storage deletion'
);
reset role;
select is(
  (select attempt_count from public.deletion_requests
   where id = (select request_id from first_request)),
  1,
  'claim increments the bounded attempt count'
);

set local role service_role;
select ok(
  public.fail_account_deletion(
    (select request_id from first_request), 'storage_list_failed'
  ),
  'storage listing failure is recorded'
);
reset role;
select is(
  (select current_stage from public.deletion_requests
   where id = (select request_id from first_request)),
  'retryable_failure'::public.deletion_request_state,
  'provider failure enters retryable state'
);
select is(
  (select resume_stage from public.deletion_requests
   where id = (select request_id from first_request)),
  'storage_deleting'::public.deletion_request_state,
  'retry remembers the exact failed stage'
);
select is(
  (select last_error_code from public.deletion_requests
   where id = (select request_id from first_request)),
  'storage_list_failed',
  'only a stable bounded error code is retained'
);

update public.deletion_requests
set available_at = now() - interval '1 second'
where id = (select request_id from first_request);
set local role service_role;
create temp table retry_claim as
select * from public.claim_account_deletion_requests(5);
select is(
  (select stage from retry_claim
   where request_id = (select request_id from first_request)),
  'storage_deleting'::public.deletion_request_state,
  'retry resumes at storage rather than restarting account state'
);
reset role;
select is(
  (select attempt_count from public.deletion_requests
   where id = (select request_id from first_request)),
  2,
  'retry increments attempt count once'
);

set local role service_role;
select ok(
  public.advance_account_deletion(
    (select request_id from first_request),
    'storage_deleting', 'database_deleting', 3, 104
  ),
  'verified storage cleanup advances atomically'
);
reset role;
select is(
  (select current_stage from public.deletion_requests
   where id = (select request_id from first_request)),
  'database_deleting'::public.deletion_request_state,
  'database cleanup follows verified storage cleanup'
);

set local role service_role;
select ok(
  public.delete_account_database_records((select request_id from first_request)),
  'database cleanup deletes the owned profile graph'
);
reset role;
select is(
  (select count(*)::integer from public.profiles
   where id = '10000000-0000-0000-0000-000000000001'),
  0,
  'profile is deleted'
);
select is(
  (select count(*)::integer from public.questions
   where author_id = '10000000-0000-0000-0000-000000000001'),
  0,
  'owned questions cascade'
);
select is(
  (select count(*)::integer from public.storage_cleanup_jobs
   where split_part(object_name, '/', 1)
     = '10000000-0000-0000-0000-000000000001'),
  0,
  'storage cleanup queue does not retain a deleted user identifier'
);
select is(
  (select selected_user_id from public.daily_draws
   where id = '10000000-0000-0000-0000-000000000010'),
  null::uuid,
  'published draw survives as an anonymous tombstone'
);
select is(
  (select user_id from public.analytics_events
   where install_id = '10000000-0000-0000-0000-000000000012'),
  null::uuid,
  'analytics event is detached from the deleted account'
);
select is(
  (select subject_id from public.moderation_events
   where reason = 'Anonymized deletion audit fixture'),
  null::uuid,
  'moderation audit survives only in anonymized form'
);
select is(
  (select count(*)::integer from auth.users
   where id = '10000000-0000-0000-0000-000000000001'),
  1,
  'Auth is deliberately retained until database cleanup succeeds'
);
select is(
  (select current_stage from public.deletion_requests
   where id = (select request_id from first_request)),
  'auth_deleting'::public.deletion_request_state,
  'request reaches Auth deletion last'
);

set local role service_role;
select is(
  public.complete_account_deletion((select request_id from first_request)),
  false,
  'request cannot be marked complete while Auth user remains'
);
reset role;
delete from auth.users
where id = '10000000-0000-0000-0000-000000000001';
set local role service_role;
select ok(
  public.complete_account_deletion((select request_id from first_request)),
  'request completes after Auth deletion is confirmed'
);
reset role;
select is(
  (select current_stage from public.deletion_requests
   where id = (select request_id from first_request)),
  'completed'::public.deletion_request_state,
  'completed state is durable'
);
select is(
  (select user_id from public.deletion_requests
   where id = (select request_id from first_request)),
  null::uuid,
  'completed operational record no longer contains the user id'
);
select ok(
  (select completed_at is not null from public.deletion_requests
   where id = (select request_id from first_request)),
  'completion timestamp is recorded'
);
select is(
  (select count(*)::integer from auth.users
   where id = '10000000-0000-0000-0000-000000000001'),
  0,
  'provider identity and sub are deleted with Auth user'
);
set local role authenticated;
select is(
  (select count(*)::integer from public.my_deletion_request()),
  0,
  'anonymized completion is no longer linked through caller-scoped status'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002', true
);
set local role authenticated;
select is(
  public.has_recent_authentication(), false,
  'old session fails recent-auth check'
);
select throws_ok(
  $$select public.request_account_deletion(
    '33333333-3333-4333-8333-333333333333'
  )$$,
  '42501', 'Recent authentication required',
  'database refuses deletion from an old session'
);
reset role;
select is(
  (select account_status from public.profiles
   where id = '10000000-0000-0000-0000-000000000002'),
  'active'::public.account_status,
  'failed recent-auth check leaves account fully active'
);

insert into public.deletion_requests (
  user_id, current_stage, attempt_count, locked_at, idempotency_key_hash
) values (
  '10000000-0000-0000-0000-000000000003',
  'storage_deleting', 10, now(), repeat('c', 64)
);
set local role service_role;
select ok(
  public.fail_account_deletion(
    (select id from public.deletion_requests
     where user_id = '10000000-0000-0000-0000-000000000003'),
    'storage_verify_failed'
  ),
  'tenth failure is handled explicitly'
);
reset role;
select is(
  (select current_stage from public.deletion_requests
   where user_id = '10000000-0000-0000-0000-000000000003'),
  'manual_review'::public.deletion_request_state,
  'exhausted retries become visible manual review'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003', true
);
set local role authenticated;
select ok(
  public.can_insert_owned_storage_object(
    'portraits',
    '10000000-0000-0000-0000-000000000003/10000000-0000-4000-8000-000000000020/photo/10000000-0000-4000-8000-000000000021.jpg',
    '{"mimetype":"image/jpeg","size":1024}'::jsonb
  ),
  'valid versioned JPEG path passes storage policy helper'
);
reset role;
select is(
  (select allowed_mime_types from storage.buckets where id = 'portraits'),
  array['image/jpeg']::text[],
  'portrait bucket rejects non-JPEG MIME before object insertion'
);
select is(
  (select file_size_limit from storage.buckets where id = 'portraits'),
  8388608::bigint,
  'portrait bucket rejects objects above 8 MiB before insertion'
);
set local role authenticated;
select is(
  public.can_insert_owned_storage_object(
    'portraits',
    '10000000-0000-0000-0000-000000000002/10000000-0000-4000-8000-000000000020/photo/10000000-0000-4000-8000-000000000021.jpg',
    '{"mimetype":"image/jpeg","size":1024}'::jsonb
  ),
  false,
  'another user prefix is rejected'
);
reset role;

insert into public.daily_draws (
  id, selection_date, candidate_pool_hash, candidate_count, random_seed,
  selected_user_id, selection_status
) values (
  '10000000-0000-0000-0000-000000000030', current_date + 30,
  repeat('d', 64), 1, repeat('e', 64),
  '10000000-0000-0000-0000-000000000003', 'accepted'
);
insert into public.portraits (
  id, draw_id, user_id, status, photo_path
) values (
  '10000000-0000-4000-8000-000000000020',
  '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000003', 'draft',
  '10000000-0000-0000-0000-000000000003/legacy/photo.jpg'
);
insert into storage.objects (bucket_id, name, owner_id, metadata, created_at)
values
  (
    'portraits',
    '10000000-0000-0000-0000-000000000003/legacy/photo.jpg',
    '10000000-0000-0000-0000-000000000003',
    '{"mimetype":"image/jpeg","size":512}'::jsonb,
    now() - interval '2 hours'
  ),
  (
    'portraits',
    '10000000-0000-0000-0000-000000000003/10000000-0000-4000-8000-000000000020/photo/10000000-0000-4000-8000-000000000021.jpg',
    '10000000-0000-0000-0000-000000000003',
    '{"mimetype":"image/jpeg","size":1024}'::jsonb,
    now()
  );

set local role service_role;
select is(
  public.register_validated_portrait_photo(
    '10000000-0000-0000-0000-000000000003',
    '10000000-0000-4000-8000-000000000020',
    '10000000-0000-0000-0000-000000000003/10000000-0000-4000-8000-000000000020/photo/10000000-0000-4000-8000-000000000021.jpg',
    1024
  ),
  '10000000-0000-0000-0000-000000000003/10000000-0000-4000-8000-000000000020/photo/10000000-0000-4000-8000-000000000021.jpg',
  'validated upload is atomically registered'
);
reset role;
select is(
  (select photo_path from public.portraits
   where id = '10000000-0000-4000-8000-000000000020'),
  '10000000-0000-0000-0000-000000000003/10000000-0000-4000-8000-000000000020/photo/10000000-0000-4000-8000-000000000021.jpg',
  'portrait points at the new unique version'
);
select is(
  (select count(*)::integer from public.storage_cleanup_jobs
   where object_name = '10000000-0000-0000-0000-000000000003/legacy/photo.jpg'),
  1,
  'replaced object is queued in the registration transaction'
);

insert into storage.objects (bucket_id, name, owner_id, metadata, created_at)
select
  'portraits',
  '10000000-0000-0000-0000-000000000003/orphans/nested/'
    || lpad(g::text, 3, '0') || '.jpg',
  '10000000-0000-0000-0000-000000000003',
  '{"mimetype":"image/jpeg","size":128}'::jsonb,
  now() - interval '2 hours'
from generate_series(1, 105) g;

set local role service_role;
select is(
  public.enqueue_orphan_storage_objects(200),
  105,
  'reconciler discovers more than one page of nested orphan objects'
);
reset role;
select is(
  (select count(*)::integer from public.storage_cleanup_jobs
   where object_name like '%/orphans/nested/%'),
  105,
  'every nested orphan has a durable cleanup job'
);

set local role service_role;
create temp table cleanup_claim as
select * from public.claim_storage_cleanup_jobs(200);
select is(
  (select count(*)::integer from cleanup_claim),
  106,
  'cleanup worker claims replacement and orphan jobs together'
);
select ok(
  public.complete_storage_cleanup_job(
    (select job_id from cleanup_claim order by object_name limit 1)
  ),
  'completed storage cleanup removes its queue record'
);
reset role;
select is(
  (select count(*)::integer from public.storage_cleanup_jobs),
  105,
  'completed queue item cannot be retried accidentally'
);

set local role authenticated;
select is(
  public.can_insert_owned_storage_object(
    'portraits',
    '10000000-0000-0000-0000-000000000003/10000000-0000-4000-8000-000000000020/photo/20000000-0000-4000-8000-000000000021.jpg',
    '{"mimetype":"image/jpeg","size":1024}'::jsonb
  ),
  false,
  'per-user object cap protects storage quota'
);
reset role;
select ok(
  exists (
    select 1 from public.storage_cleanup_jobs
    where object_name like '%/orphans/nested/001.jpg'
  ),
  'nested object name is retained only until its cleanup succeeds'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000004', true
);
set local role authenticated;
create temp table profileless_request as
select * from public.request_account_deletion(
  '44444444-4444-4444-8444-444444444444'
);
select is(
  (select state from profileless_request),
  'account_locked'::public.deletion_request_state,
  'account can be locked before onboarding creates a profile'
);
reset role;
select is(
  (select count(*)::integer from public.deletion_requests
   where user_id = '10000000-0000-0000-0000-000000000004'),
  1,
  'profileless account still gets a durable deletion request'
);
select is(
  (select count(*)::integer from public.account_enforcement_jobs
   where user_id = '10000000-0000-0000-0000-000000000004'),
  0,
  'profileless request does not create an invalid profile outbox reference'
);
set local role authenticated;
select throws_ok(
  $$insert into public.profiles (
    id, username, display_name, birth_year, country_code,
    wants_selection, locale
  ) values (
    '10000000-0000-0000-0000-000000000004', 'too_late',
    'Too Late', 1990, 'DE', false, 'en'
  )$$,
  '42501', 'new row violates row-level security policy for table "profiles"',
  'stale JWT cannot create a profile after deletion begins'
);
reset role;

select * from finish();
rollback;
