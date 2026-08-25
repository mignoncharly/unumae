begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.add_auth_user(
  target_id uuid,
  target_email text,
  confirmed boolean default true
)
returns void
language sql
as $$
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    target_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', target_email, '',
    case when confirmed then now() else null end,
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );
$$;

select pg_temp.add_auth_user(
  '40000000-0000-0000-0000-000000000001',
  'First.Person+pool@gmail.com'
);
select pg_temp.add_auth_user(
  '40000000-0000-0000-0000-000000000002',
  'reviewer@example.test'
);
select pg_temp.add_auth_user(
  '40000000-0000-0000-0000-000000000003',
  'second-device@example.test'
);
select pg_temp.add_auth_user(
  '40000000-0000-0000-0000-000000000004',
  'age-boundary@example.test'
);
select pg_temp.add_auth_user(
  '40000000-0000-0000-0000-000000000005',
  'firstperson+alias@googlemail.com'
);

insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values
  (
    'apple-stable-sub-1',
    '40000000-0000-0000-0000-000000000001',
    '{"email":"First.Person+pool@gmail.com"}',
    'apple', now(), now(), now()
  ),
  (
    'apple-stable-sub-2',
    '40000000-0000-0000-0000-000000000003',
    '{"email":"second-device@example.test"}',
    'apple', now(), now(), now()
  );

insert into public.profiles (
  id, username, display_name, birth_year, country_code,
  wants_selection, locale, created_at, accepted_rules_at
) values
  (
    '40000000-0000-0000-0000-000000000001',
    'phase4_first', 'Phase Four First',
    extract(year from (current_timestamp at time zone 'UTC'))::integer - 16,
    'DE', true, 'en', now() - interval '8 days', now()
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'phase4_reviewer', 'Phase Four Reviewer', 1990,
    'DE', false, 'en', now() - interval '8 days', now()
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'phase4_second', 'Phase Four Second', 1990,
    'DE', true, 'en', now() - interval '8 days', now()
  );

insert into public.moderators (user_id, note) values (
  '40000000-0000-0000-0000-000000000002', 'Phase 4 reviewer'
);

select is(
  public.normalize_assurance_email(' First.Person+tag@GMAIL.COM '),
  'firstperson@gmail.com',
  'Gmail case, dots, and plus tags normalize to one address'
);
select is(
  public.normalize_assurance_email('firstperson@googlemail.com'),
  'firstperson@gmail.com',
  'googlemail and gmail normalize to the same provider domain'
);
select is(
  public.normalize_assurance_email('A.B+tag@example.test'),
  'a.b@example.test',
  'dots remain significant for providers that do not ignore them'
);
select throws_ok(
  $$select public.normalize_assurance_email('user@mailinator.com')$$,
  '23514', 'Disposable or invalid email address is not eligible',
  'disposable domains are rejected'
);
select throws_ok(
  $$select public.normalize_assurance_email('usеr@example.test')$$,
  '23514', 'Email address cannot be normalized safely',
  'unicode look-alikes are rejected rather than ambiguously normalized'
);

select throws_ok(
  $$insert into public.profiles (
      id, username, display_name, birth_year, country_code,
      wants_selection, locale
    ) values (
      '40000000-0000-0000-0000-000000000004',
      'phase4_young', 'Phase Four Young',
      extract(year from (current_timestamp at time zone 'UTC'))::integer - 15,
      'DE', false, 'en'
    )$$,
  '23514', 'Minimum age is 16 on January 1 UTC of the current year',
  'a birth year that may still be 15 is rejected in the database'
);
select lives_ok(
  $$update public.profiles
    set birth_year = extract(
      year from (current_timestamp at time zone 'UTC')
    )::integer - 16
    where id = '40000000-0000-0000-0000-000000000001'$$,
  'the conservative January 1 boundary is admitted'
);

select throws_ok(
  $$insert into public.profiles (
      id, username, display_name, birth_year, country_code,
      wants_selection, locale
    ) values (
      '40000000-0000-0000-0000-000000000005',
      'phase4_alias', 'Phase Four Alias', 1990, 'DE', false, 'en'
    )$$,
  '23505',
  'duplicate key value violates unique constraint "account_email_addresses_normalized_email_key"',
  'a normalized email alias cannot create a second profiled account'
);

select is(
  (select assurance_level from public.profiles
   where id = '40000000-0000-0000-0000-000000000001'),
  'provider_verified'::public.assurance_level,
  'provider assurance is derived from auth.identities'
);
select is(
  (select provider_id from public.provider_bindings
   where user_id = '40000000-0000-0000-0000-000000000001'),
  'apple-stable-sub-1',
  'the stable Apple sub, not the relay email, is bound'
);
select throws_ok(
  $$insert into public.provider_bindings (user_id, provider, provider_id)
    values (
      '40000000-0000-0000-0000-000000000003',
      'apple', 'apple-stable-sub-1'
    )$$,
  '23505',
  'duplicate key value violates unique constraint "provider_bindings_pkey"',
  'one provider identifier cannot bind to two accounts'
);

select ok(
  not public.consume_attestation_challenge(
    '40000000-0000-0000-0000-000000000001',
    public.create_attestation_challenge(
      '40000000-0000-0000-0000-000000000001',
      'ios', extensions.digest('real challenge', 'sha256'),
      now() + interval '5 minutes'
    ),
    extensions.digest('wrong challenge', 'sha256')
  ),
  'a challenge cannot be consumed with a different digest'
);

create temp table phase4_challenge (id uuid);
insert into phase4_challenge values (
  public.create_attestation_challenge(
    '40000000-0000-0000-0000-000000000001',
    'ios', extensions.digest('one time challenge', 'sha256'),
    now() + interval '5 minutes'
  )
);
select ok(
  public.consume_attestation_challenge(
    '40000000-0000-0000-0000-000000000001',
    (select id from phase4_challenge),
    extensions.digest('one time challenge', 'sha256')
  ),
  'a live matching challenge is consumed once'
);
select ok(
  not public.consume_attestation_challenge(
    '40000000-0000-0000-0000-000000000001',
    (select id from phase4_challenge),
    extensions.digest('one time challenge', 'sha256')
  ),
  'a replayed challenge is rejected'
);
select throws_ok(
  $$select public.create_attestation_challenge(
      '40000000-0000-0000-0000-000000000001',
      'ios', '\x01'::bytea, now() + interval '5 minutes'
    )$$,
  '23514', 'Invalid attestation challenge',
  'a malformed challenge digest is rejected'
);

select public.register_verified_device_attestation(
  '40000000-0000-0000-0000-000000000001',
  'ios', extensions.digest('persistent-device-one', 'sha256'),
  extensions.digest('app-attest-key-one', 'sha256'), 'public-key-one', false
);
select ok(
  public.bind_verified_device_to_pool(
    '40000000-0000-0000-0000-000000000001',
    extensions.digest('persistent-device-one', 'sha256')
  ),
  'a server-verified unbound device can be bound at pool entry'
);

insert into public.daily_draws (
  id, selection_date, candidate_pool_hash, candidate_count,
  random_seed, selection_status
) values (
  '40000000-0000-0000-0000-000000000010',
  (current_timestamp at time zone 'UTC')::date - 1,
  repeat('a', 64), 0, repeat('b', 64), 'completed'
);
insert into public.remembers (user_id, draw_id) values (
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000010'
);

select public.refresh_selection_eligibility();
select ok(
  public.is_eligible('40000000-0000-0000-0000-000000000001'),
  'provider, device, age, rules, profile, activity, and account age admit the account'
);

select public.register_verified_device_attestation(
  '40000000-0000-0000-0000-000000000003',
  'ios', extensions.digest('persistent-device-one', 'sha256'),
  extensions.digest('app-attest-key-two', 'sha256'), 'public-key-two', true
);
select ok(
  exists (
    select 1 from public.account_flags f
    where f.user_id = '40000000-0000-0000-0000-000000000003'
      and f.signal_kind = 'device_already_bound'
      and f.cleared_at is null
  ),
  'a second account on a platform-bound device enters manual review'
);
select ok(
  not public.is_eligible('40000000-0000-0000-0000-000000000003'),
  'a flagged account is excluded from the draw'
);

create temp table phase4_flag (id uuid);
insert into phase4_flag
select id from public.account_flags
where user_id = '40000000-0000-0000-0000-000000000003'
  and signal_kind = 'device_already_bound' and cleared_at is null;
grant select on phase4_flag to authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000002', true
);
set local role authenticated;

select throws_ok(
  $$update public.profiles set assurance_level = 'reviewed'
    where id = '40000000-0000-0000-0000-000000000002'$$,
  '42501', 'permission denied for table profiles',
  'a client cannot assert its own assurance state'
);
select ok(
  public.review_account_flag(
    (select id from phase4_flag),
    'cleared', 'Shared family device confirmed.'
  ),
  'a moderator can clear a false-positive signal'
);

reset role;
select ok(
  exists (
    select 1 from public.account_flag_reviews r
    join public.account_flags f on f.id = r.flag_id
    where f.user_id = '40000000-0000-0000-0000-000000000003'
      and r.decision = 'cleared'
      and r.reviewer_id = '40000000-0000-0000-0000-000000000002'
  ),
  'the manual-review decision is append-only and attributed'
);

select throws_ok(
  $$select public.run_daily_draw(
      (current_timestamp at time zone 'UTC')::date + 29
    )$$,
  '55000',
  'No frozen precommit exists for ' ||
    ((current_timestamp at time zone 'UTC')::date + 29)::text,
  'the draw fails closed when its inputs were not precommitted'
);

select is(
  public.precommit_daily_draw(
    (current_timestamp at time zone 'UTC')::date + 30
  ),
  (current_timestamp at time zone 'UTC')::date + 30,
  'the service can freeze and commit a future draw pool'
);
select is(
  (select candidate_count from public.draw_precommits
   where selection_date =
     (current_timestamp at time zone 'UTC')::date + 30),
  1,
  'the precommit freezes only the fully eligible account'
);
select throws_ok(
  $$update public.draw_precommits set candidate_count = 99
    where selection_date =
      (current_timestamp at time zone 'UTC')::date + 30$$,
  '55000', 'Draw precommits are append-only',
  'the pool and entropy commitment cannot be rewritten'
);

create temp table phase4_draw (id uuid);
insert into phase4_draw values (
  public.run_daily_draw(
    (current_timestamp at time zone 'UTC')::date + 30
  )
);
select ok(
  exists (
    select 1
    from public.daily_draws d
    join public.draw_precommits p using (selection_date)
    where d.id = (select id from phase4_draw)
      and d.candidate_pool_hash = p.candidate_pool_hash
      and d.entropy_commitment = p.entropy_commitment
      and d.precommitted_at = p.committed_at
      and d.selected_user_id =
        '40000000-0000-0000-0000-000000000001'
  ),
  'the draw uses exactly the precommitted pool and entropy'
);
select is(
  (select revealed_seed from public.get_draw_commitment(
    (current_timestamp at time zone 'UTC')::date + 30
  )),
  null::text,
  'the committed seed stays secret before publication'
);
update public.daily_draws set selection_status = 'live', published_at = now()
where id = (select id from phase4_draw);
select ok(
  exists (
    select 1
    from public.get_draw_commitment(
      (current_timestamp at time zone 'UTC')::date + 30
    ) c
    where encode(extensions.digest(c.revealed_seed, 'sha256'), 'hex') =
      c.entropy_commitment
      and c.randomness_source = 'commit_reveal_v1'
      and c.algorithm_version = 'hmac-sha256-v1'
  ),
  'publication reveals independently verifiable entropy and version metadata'
);

delete from public.profiles
where id = '40000000-0000-0000-0000-000000000001';

select ok(
  not exists (
    select 1 from public.provider_bindings
    where provider_id = 'apple-stable-sub-1'
  ),
  'provider identifiers are removed with the account'
);
select ok(
  not exists (
    select 1 from public.account_email_addresses
    where normalized_email = 'firstperson@gmail.com'
  ),
  'normalized email is removed with the account'
);
select ok(
  exists (
    select 1 from public.device_binding_flags d
    where d.opaque_binding_hash = extensions.digest(
      'persistent-device-one', 'sha256'
    ) and d.pool_bound_at is not null and d.bound_account_id is null
  ),
  'the opaque abuse-prevention device flag survives account deletion without a user link'
);
select ok(
  not exists (
    select 1 from public.account_device_attestations a
    where a.key_id_hash = extensions.digest('app-attest-key-one', 'sha256')
  ),
  'account-specific attestation keys are deleted'
);

select * from finish();
rollback;
