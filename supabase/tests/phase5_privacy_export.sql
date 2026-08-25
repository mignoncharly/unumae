begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '50000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'Phase.Five+export@gmail.com', '', now(),
  '{"provider":"apple","providers":["apple"]}', '{}', now(), now()
);

insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  'phase5-apple-sub', '50000000-0000-0000-0000-000000000001',
  '{"email":"Phase.Five+export@gmail.com"}', 'apple', now(), now(), now()
);

insert into public.profiles (
  id, username, display_name, birth_year, country_code, wants_selection,
  locale, created_at, accepted_rules_at
) values (
  '50000000-0000-0000-0000-000000000001', 'phase5_export',
  'Phase Five Export', 1990, 'DE', true, 'en', now() - interval '8 days', now()
);

select public.register_verified_device_attestation(
  '50000000-0000-0000-0000-000000000001', 'ios',
  extensions.digest('phase5-device', 'sha256'),
  extensions.digest('phase5-key', 'sha256'), 'phase5-public-key', false
);
select public.record_account_network_signal(
  '50000000-0000-0000-0000-000000000001',
  extensions.digest('phase5-network', 'sha256'), 64500, 'unknown'
);

create temp table phase5_flag (id uuid);
insert into phase5_flag
select public.raise_account_signal(
  '50000000-0000-0000-0000-000000000001', 'device_already_bound',
  extensions.digest('phase5-device', 'sha256'), 'Internal signal context.'
);
insert into public.account_flag_reviews (flag_id, decision, note)
select id, 'cleared', 'False positive reviewed.' from phase5_flag;

insert into public.content_reports (
  reporter_id, target_type, target_id, reason, note
) values (
  '50000000-0000-0000-0000-000000000001', 'profile',
  '50000000-0000-0000-0000-000000000001', 'other', 'Fixture report.'
);
insert into public.moderation_decisions (
  target_type, target_id, decision, reason
) values (
  'profile', '50000000-0000-0000-0000-000000000001',
  'approved', 'Fixture moderation decision.'
);
insert into public.account_enforcement_jobs (
  user_id, target_status, status_version, idempotency_key
) values (
  '50000000-0000-0000-0000-000000000001', 'active', 1, 'phase5-fixture'
);
insert into public.storage_cleanup_jobs (bucket_id, object_name)
values (
  'avatars',
  '50000000-0000-0000-0000-000000000001/avatar/50000000-0000-4000-8000-000000000099.jpg'
);

insert into public.draw_precommits (
  selection_date, candidate_pool_hash, candidate_count,
  entropy_commitment, secret_seed
) values (
  (current_timestamp at time zone 'UTC')::date + 60,
  repeat('a', 64), 1, repeat('b', 64), repeat('c', 64)
);
insert into public.draw_precommit_candidates (selection_date, user_id) values (
  (current_timestamp at time zone 'UTC')::date + 60,
  '50000000-0000-0000-0000-000000000001'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true
);
set local role authenticated;

select is(
  (public.export_my_data()::jsonb ->> 'schema_version')::integer,
  3,
  'the account export remains schema version 3'
);
select is(
  public.export_my_data()::jsonb #>> '{account_assurance,normalized_email,value}',
  'phasefive@gmail.com',
  'normalized contact data is exported'
);
select is(
  public.export_my_data()::jsonb #>> '{account_assurance,provider_bindings,0,provider_id}',
  'phase5-apple-sub',
  'the subject receives their own stable provider identifier'
);
select is(
  jsonb_array_length(public.export_my_data()::jsonb #> '{account_assurance,device_attestations}'),
  1,
  'device assurance metadata is exported'
);
select ok(
  not ((public.export_my_data()::jsonb #> '{account_assurance,device_attestations,0}') ? 'public_key'),
  'attestation cryptographic material is withheld'
);
select is(
  (public.export_my_data()::jsonb #>> '{account_assurance,network_signal_summary,count}')::integer,
  1,
  'anti-abuse records are represented without revealing the signal'
);
select is(
  jsonb_array_length(public.export_my_data()::jsonb -> 'account_review_flags'),
  1,
  'account flags and their review are exported'
);
select ok(
  not ((public.export_my_data()::jsonb -> 'account_review_flags' -> 0) ? 'signal_hash'),
  'abuse-detection hashes are withheld'
);
select is(
  jsonb_array_length(public.export_my_data()::jsonb -> 'reports_about_me'),
  1,
  'reports involving the subject are exported'
);
select ok(
  not ((public.export_my_data()::jsonb -> 'reports_about_me' -> 0) ? 'reporter_id'),
  'reporter identifiers are withheld'
);
select is(
  jsonb_array_length(public.export_my_data()::jsonb -> 'moderation_decisions_about_me'),
  1,
  'moderation decisions about the subject are exported'
);
select is(
  jsonb_array_length(public.export_my_data()::jsonb -> 'selection_precommits'),
  1,
  'frozen draw membership is exported'
);
select is(
  jsonb_array_length(public.export_my_data()::jsonb -> 'account_enforcement_history'),
  1,
  'account enforcement operations are exported'
);
select is(
  jsonb_array_length(public.export_my_data()::jsonb -> 'storage_cleanup_jobs'),
  1,
  'account-owned storage operations are exported'
);
select is(
  (public.export_my_data()::jsonb #>> '{export_scope,maximum_bytes}')::integer,
  5242880,
  'the synchronous export declares its five MiB cap'
);

reset role;
delete from public.profiles
where id = '50000000-0000-0000-0000-000000000001';

select ok(
  not exists (
    select 1 from public.draw_precommit_candidates
    where user_id = '50000000-0000-0000-0000-000000000001'
  ),
  'precommitted candidate membership leaves with the account'
);
select ok(
  exists (
    select 1 from public.device_binding_flags
    where opaque_binding_hash = extensions.digest('phase5-device', 'sha256')
      and bound_account_id is null
  ),
  'only the disclosed non-identifying device flag survives deletion'
);
select ok(
  not exists (
    select 1 from public.provider_bindings
    where provider_id = 'phase5-apple-sub'
  ),
  'provider identifiers do not survive deletion'
);

select * from finish();
rollback;
