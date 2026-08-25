begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

create temporary table phase7_state (
  name text primary key,
  bigint_value bigint,
  uuid_value uuid,
  text_value text
);

insert into public.job_runs (job, ok, status, detail)
values ('phase7-retry', false, 'queued', 'test') returning id;
insert into phase7_state (name, bigint_value)
select 'retry-run', max(id) from public.job_runs where job = 'phase7-retry';
insert into phase7_state (name, uuid_value)
select 'retry-lease', public.claim_worker_run(
  (select bigint_value from phase7_state where name = 'retry-run'),
  'phase7-retry', null
);

select ok(
  (select uuid_value is not null from phase7_state where name = 'retry-lease'),
  'a queued worker run acquires a durable lease'
);
select is(
  public.claim_worker_run(
    (select bigint_value from phase7_state where name = 'retry-run'),
    'phase7-retry', extensions.gen_random_uuid()
  ), null::uuid,
  'a worker lease cannot be stolen'
);
select ok(public.complete_worker_run(
  (select bigint_value from phase7_state where name = 'retry-run'),
  (select uuid_value from phase7_state where name = 'retry-lease'),
  false, true, 'bounded provider failure', 'timeout'
), 'a retryable worker outcome is recorded');
select is(
  (select status from public.job_runs where id =
    (select bigint_value from phase7_state where name = 'retry-run')),
  'queued', 'a retryable worker run returns to the queue'
);

update public.job_runs set next_attempt_at = now()
where id = (select bigint_value from phase7_state where name = 'retry-run');
update phase7_state set uuid_value = public.claim_worker_run(
  (select bigint_value from phase7_state where name = 'retry-run'),
  'phase7-retry', null
) where name = 'retry-lease';
select ok(public.complete_worker_run(
  (select bigint_value from phase7_state where name = 'retry-run'),
  (select uuid_value from phase7_state where name = 'retry-lease'),
  false, true, 'bounded provider failure', 'timeout'
), 'the second bounded attempt completes');
update public.job_runs set next_attempt_at = now()
where id = (select bigint_value from phase7_state where name = 'retry-run');
update phase7_state set uuid_value = public.claim_worker_run(
  (select bigint_value from phase7_state where name = 'retry-run'),
  'phase7-retry', null
) where name = 'retry-lease';
select ok(public.complete_worker_run(
  (select bigint_value from phase7_state where name = 'retry-run'),
  (select uuid_value from phase7_state where name = 'retry-lease'),
  false, true, 'bounded provider failure', 'timeout'
), 'the final bounded attempt completes');
select is(
  (select status from public.job_runs where id =
    (select bigint_value from phase7_state where name = 'retry-run')),
  'dead_letter', 'a worker enters dead letter after its maximum attempts'
);

insert into public.job_runs (job, ok, status, detail)
values ('phase7-crash', false, 'queued', 'test');
insert into phase7_state (name, bigint_value)
select 'crash-run', max(id) from public.job_runs where job = 'phase7-crash';
select ok(public.claim_worker_run(
  (select bigint_value from phase7_state where name = 'crash-run'),
  'phase7-crash', null
) is not null, 'a crash fixture acquires a lease');
update public.job_runs set lease_expires_at = now() - interval '1 second'
where id = (select bigint_value from phase7_state where name = 'crash-run');
select is(public.recover_worker_runs(), 1, 'an expired worker lease is recovered');
select is(
  (select status from public.job_runs where id =
    (select bigint_value from phase7_state where name = 'crash-run')),
  'queued', 'a crashed worker becomes retryable'
);
select ok(exists(
  select 1 from public.operational_alerts where code = 'worker_stale_lease'
), 'an expired lease creates a durable operational alert');

select is(public.record_translation_attempt(
  'portrait', '70000000-0000-0000-0000-000000000001', 'origin', 'de',
  false, 'provider_error'
), 'retry', 'a translation provider failure starts a bounded retry');
select public.record_translation_attempt(
  'portrait', '70000000-0000-0000-0000-000000000001', 'origin', 'de',
  false, 'provider_error'
) from generate_series(1, 4);
select is(
  (select status from public.translation_failures where
    target_id = '70000000-0000-0000-0000-000000000001'),
  'dead_letter', 'a repeatedly failing translation becomes visible dead letter'
);
select is(public.record_translation_attempt(
  'portrait', '70000000-0000-0000-0000-000000000001', 'origin', 'de',
  true, null
), 'succeeded', 'an idempotent translation success clears failure state');
select is(
  (select count(*)::integer from public.translation_failures where
    target_id = '70000000-0000-0000-0000-000000000001'),
  0, 'successful translation cleanup is idempotent'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '70000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'phase7@example.test', '', now(), '{"provider":"email","providers":["email"]}',
  '{}', now(), now()
);
insert into public.profiles (
  id, username, display_name, birth_year, country_code, wants_selection,
  locale, accepted_rules_at
) values (
  '70000000-0000-0000-0000-000000000010', 'phase7_user', 'Phase Seven',
  1990, 'DE', false, 'en', now()
);
insert into public.push_tokens (token, user_id, platform)
values ('ExpoPushToken[phase7_receipt]',
  '70000000-0000-0000-0000-000000000010', 'android');
insert into public.notification_deliveries (
  user_id, category, dedupe_key, channel, destination_hash, status, provider_id
) values (
  '70000000-0000-0000-0000-000000000010', 'daily', 'phase7', 'push',
  repeat('a', 64), 'accepted', 'phase7-ticket'
);
select ok(public.enqueue_expo_push_receipt(
  'phase7-ticket', 'ExpoPushToken[phase7_receipt]',
  '70000000-0000-0000-0000-000000000010'
), 'an accepted Expo ticket enters the receipt queue');
update public.expo_push_receipts set available_at = now();
insert into phase7_state (name, text_value, uuid_value)
select 'receipt', ticket_id, lease_token
from public.claim_expo_push_receipts(10) where ticket_id = 'phase7-ticket';
select ok((select uuid_value is not null from phase7_state where name = 'receipt'),
  'a due Expo receipt is leased');
select ok(public.complete_expo_push_receipt(
  'phase7-ticket', (select uuid_value from phase7_state where name = 'receipt'),
  false, true, 'permanent_destination'
), 'a permanent receipt failure is completed');
select is(
  (select count(*)::integer from public.push_tokens
    where token = 'ExpoPushToken[phase7_receipt]'),
  0, 'a permanently invalid Expo destination is disabled'
);

select ok(public.record_resource_quota_status(
  1, 100, 100, 80, 79
), 'resource quota observations are recorded without provider payloads');
insert into public.job_runs (job, ok, status, detail, completed_at, provider_category)
select 'phase7-failing-worker', false, 'failed', 'safe category', now(), 'auth'
from generate_series(1, 3);
insert into public.job_runs (job, ok, status, detail)
select 'phase7-deep-queue', false, 'queued', 'queued'
from generate_series(1, 10);
insert into public.notification_deliveries (
  user_id, category, dedupe_key, channel, destination_hash, status, error_code
)
select '70000000-0000-0000-0000-000000000010', 'daily', 'collapse-' || n,
  'push', md5(n::text) || md5(n::text), 'failed', 'provider_error'
from generate_series(1, 10) n;
select ok(public.refresh_operational_alerts() >= 5,
  'expanded operational alerts inspect workers, providers, delivery, and quota');
select ok(exists(select 1 from public.operational_alerts
  where code = 'worker_repeated_failures'), 'repeated worker failures alert');
select ok(exists(select 1 from public.operational_alerts
  where code = 'worker_queue_depth'), 'growing worker queue alert');
select ok(exists(select 1 from public.operational_alerts
  where code = 'provider_authentication'), 'provider authentication alert');
select ok(exists(select 1 from public.operational_alerts
  where code = 'notification_delivery_collapse'), 'delivery collapse alert');
select is((select count(*)::integer from public.operational_alerts
  where code = 'resource_quota_approaching'), 2,
  'database and storage quota alerts fire at eighty percent, egress below it does not');

select * from finish();
rollback;
