begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.add_user(target_id uuid, target_email text, target_name text)
returns void language plpgsql as $$
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    target_id, '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', target_email, '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );
  insert into public.profiles (
    id, username, display_name, birth_year, country_code,
    wants_selection, locale, accepted_rules_at
  ) values (target_id, target_name, target_name, 1990, 'DE', false, 'en', now());
end;
$$;

select pg_temp.add_user('60000000-0000-0000-0000-000000000001', 'phase6-a@example.test', 'phase6_a');
select pg_temp.add_user('60000000-0000-0000-0000-000000000002', 'phase6-b@example.test', 'phase6_b');

do $$
declare
  n integer;
  flag uuid;
  attestation uuid;
begin
  for n in 1..5 loop
    insert into public.device_binding_flags (platform, opaque_binding_hash)
    values ('ios', extensions.digest('phase6-device-' || n, 'sha256')) returning id into flag;
    insert into public.account_device_attestations (
      user_id, device_flag_id, platform, key_id_hash
    ) values (
      case when n = 5 then '60000000-0000-0000-0000-000000000002'::uuid
        else '60000000-0000-0000-0000-000000000001'::uuid end,
      flag, 'ios', extensions.digest('phase6-key-' || n, 'sha256')
    ) returning id into attestation;
    perform public.create_attested_installation_session(
      case when n = 5 then '60000000-0000-0000-0000-000000000002'::uuid
        else '60000000-0000-0000-0000-000000000001'::uuid end,
      attestation, extensions.digest(repeat(n::text, 43), 'sha256'),
      now() + interval '30 days'
    );
  end loop;
end;
$$;

select ok(
  public.authorize_installation_request(
    '60000000-0000-0000-0000-000000000001',
    extensions.digest(repeat('1', 43), 'sha256'), 'phase6-test', 1, 60
  ),
  'an attested installation is authorized'
);
select ok(
  not public.authorize_installation_request(
    '60000000-0000-0000-0000-000000000001',
    extensions.digest('rotated-client-id', 'sha256'), 'phase6-test', 1, 60
  ),
  'rotating a client identifier does not create a trusted installation'
);
select is(
  public.ingest_analytics_events(
    extensions.digest(repeat('1', 43), 'sha256'),
    extensions.digest('phase6-network', 'sha256'),
    '[{"event":"app_opened","properties":{}}]'::jsonb, false
  ), 1,
  'a bounded analytics batch from an attested session is accepted'
);
select throws_ok(
  $$select public.ingest_analytics_events(
    extensions.digest('made-up-session', 'sha256'),
    extensions.digest('phase6-network', 'sha256'),
    '[{"event":"app_opened"}]'::jsonb, false
  )$$,
  '42501', 'Installation session is invalid or expired',
  'an invented installation identifier cannot write analytics'
);
select throws_ok(
  $$select public.ingest_analytics_events(
    null, extensions.digest('phase6-web', 'sha256'),
    '[{"event":"not_real"},{"event":"archive_opened"}]'::jsonb, true
  )$$,
  '23514', 'Analytics invalid-event ratio exceeded',
  'a batch with too many invalid events is rejected atomically'
);

select set_config('request.jwt.claims', '{"sub":"60000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select throws_ok(
  $$select public.report_content('profile', '60000000-0000-0000-0000-000000000099', 'spam')$$,
  '23514', 'Report target is invalid or unavailable',
  'a nonexistent report target is rejected'
);
select throws_ok(
  $$select public.report_content('profile', '60000000-0000-0000-0000-000000000001', 'spam')$$,
  '23514', 'Report target is invalid or unavailable',
  'self-reporting cannot fill the moderation queue'
);
select lives_ok(
  $$select public.report_content('profile', '60000000-0000-0000-0000-000000000002', 'spam')$$,
  'a valid report is accepted'
);
select throws_ok(
  $$select public.report_content('profile', '60000000-0000-0000-0000-000000000002', 'spam')$$,
  '23505', 'An open report already exists for this target',
  'a duplicate open report is refused'
);
select throws_ok(
  $$select public.register_push_token('not-a-push-token', 'ios', 'phase6-session-1')$$,
  '23514', 'Invalid push or installation token',
  'malformed push tokens are rejected before storage'
);
select ok(public.register_push_token('ExpoPushToken[phase6_device_1]', 'ios', repeat('1', 43)), 'first attested push token is accepted');
select ok(public.register_push_token('ExpoPushToken[phase6_device_2]', 'ios', repeat('2', 43)), 'second attested push token is accepted');
select ok(public.register_push_token('ExpoPushToken[phase6_device_3]', 'ios', repeat('3', 43)), 'third attested push token is accepted');
select throws_ok(
  $$select public.register_push_token('ExpoPushToken[phase6_device_4]', 'ios', repeat('4', 43))$$,
  '23514', 'Push token limit exceeded',
  'a fourth active destination for one account is refused'
);
select ok(public.register_push_token('ExpoPushToken[phase6_device_1_rotated]', 'ios', repeat('1', 43)), 'a token rotates within the same attested installation');
select set_config('request.jwt.claims', '{"sub":"60000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000002', true);
select is(
  public.register_push_token('ExpoPushToken[phase6_device_1_rotated]', 'ios', repeat('5', 43)),
  false,
  'another account cannot take ownership of an existing destination'
);

reset role;
select is((select count(*)::integer from public.push_tokens where user_id = '60000000-0000-0000-0000-000000000001'), 3, 'token rotation cannot grow the queue');
select is(
  (select user_id from public.push_tokens where token = 'ExpoPushToken[phase6_device_1_rotated]'),
  '60000000-0000-0000-0000-000000000001'::uuid,
  'conflicting push ownership remains unchanged'
);
select is(
  (select count(*)::integer from public.account_flags where signal_kind = 'shared_push_token'),
  2,
  'a conflicting push destination leaves review signals for both accounts'
);
insert into public.abuse_rate_limits (scope, key_hash, window_started_at)
values ('expired-test', extensions.digest('old-counter', 'sha256'), now() - interval '3 days');
select is((public.purge_phase6_operational_data() ->> 'rate_counters')::integer, 1, 'expired rate counters are purged');
select ok((public.export_my_data_phase5() ->> 'installation_sessions') is null, 'the internal Phase 5 export remains unmodified');

select * from finish();
rollback;
