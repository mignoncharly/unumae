begin;

create extension if not exists pgtap with schema extensions;
select plan(56);

-- Stable fixture ids make failures readable without using production data.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'phase1-user@example.test', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'phase1-moderator@example.test', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'phase1-target@example.test', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.profiles (
  id, username, display_name, birth_year, country_code,
  wants_selection, locale
) values
  (
    '00000000-0000-0000-0000-0000000000a1',
    'phase1_user', 'Phase One User', 1990, 'DE', true, 'en'
  ),
  (
    '00000000-0000-0000-0000-0000000000a2',
    'phase1_mod', 'Phase One Moderator', 1990, 'DE', true, 'en'
  ),
  (
    '00000000-0000-0000-0000-0000000000a3',
    'phase1_target', 'Phase One Target', 1990, 'DE', true, 'en'
  );

insert into public.moderators (user_id, note)
values ('00000000-0000-0000-0000-0000000000a2', 'Phase 1 test');

create function pg_temp.update_own_profile(new_name text)
returns integer
language plpgsql
as $$
declare
  changed integer;
begin
  update public.profiles
  set display_name = new_name
  where id = (select auth.uid());
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create function pg_temp.update_own_portrait(target_portrait uuid, new_path text)
returns integer
language plpgsql
as $$
declare
  changed integer;
begin
  update public.portraits
  set photo_path = new_path
  where id = target_portrait;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

select has_function(
  'public', 'assert_account_active', array[]::text[],
  'central active-account assertion exists'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-0000000000a1',
  true
);
set local role authenticated;

select lives_ok(
  'select public.assert_account_active()',
  'active account passes the central assertion'
);
select ok(
  public.accept_community_rules() is not null,
  'active account can accept community rules'
);

reset role;
update public.profiles
set account_status = 'suspended'
where id = '00000000-0000-0000-0000-0000000000a1';

insert into public.moderation_events (
  id, actor_id, action, target_type, target_id, subject_id, reason
) values (
  '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000a2',
  'account_suspended', 'profile',
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000a1',
  'Phase 1 appeal fixture'
);

set local role authenticated;

select is(
  public.current_account_status(),
  'suspended'::public.account_status,
  'current account status is derived server-side'
);
select ok(public.can_submit_appeal(), 'suspended account may appeal');

select throws_ok(
  'select public.accept_community_rules()', '42501',
  'Active account required', 'suspended account cannot accept rules'
);
select throws_ok(
  'select public.accept_selection()', '42501',
  'Active account required', 'suspended account cannot accept selection'
);
select throws_ok(
  'select public.decline_selection()', '42501',
  'Active account required', 'suspended account cannot decline selection'
);
select throws_ok(
  'select public.start_my_portrait()', '42501',
  'Active account required', 'suspended account cannot start a portrait'
);
select throws_ok(
  'select public.submit_my_portrait()', '42501',
  'Active account required', 'suspended account cannot submit a portrait'
);
select throws_ok(
  $$select public.answer_question(
    '00000000-0000-0000-0000-000000000099', 'blocked answer'
  )$$,
  '42501', 'Active account required',
  'suspended account cannot answer a question'
);
select throws_ok(
  $$select public.ask_question(
    '00000000-0000-0000-0000-000000000099', 'blocked question'
  )$$,
  '42501', 'Active account required',
  'suspended account cannot ask a question'
);
select throws_ok(
  $$select public.vote_question('00000000-0000-0000-0000-000000000099')$$,
  '42501', 'Active account required',
  'suspended account cannot vote'
);
select throws_ok(
  $$select public.unvote_question('00000000-0000-0000-0000-000000000099')$$,
  '42501', 'Active account required',
  'suspended account cannot unvote'
);
select throws_ok(
  $$select public.remember_human('00000000-0000-0000-0000-000000000099')$$,
  '42501', 'Active account required',
  'suspended account cannot remember'
);
select throws_ok(
  $$select public.forget_human('00000000-0000-0000-0000-000000000099')$$,
  '42501', 'Active account required',
  'suspended account cannot forget'
);
select throws_ok(
  $$select public.report_content(
    'profile', '00000000-0000-0000-0000-0000000000a3', 'spam', null
  )$$,
  '42501', 'Active account required',
  'suspended account cannot report content'
);
select throws_ok(
  $$select public.block_content_author(
    'profile', '00000000-0000-0000-0000-0000000000a3'
  )$$,
  '42501', 'Active account required',
  'suspended account cannot block'
);
select throws_ok(
  $$select public.unblock_by_id('00000000-0000-0000-0000-000000000099')$$,
  '42501', 'Active account required',
  'suspended account cannot unblock'
);
select throws_ok(
  $$select public.request_archive_removal(
    '00000000-0000-0000-0000-000000000099', null
  )$$,
  '42501', 'Active account required',
  'suspended account cannot edit archived content'
);
select throws_ok(
  $$select public.register_push_token(
    'ExponentPushToken[test]', 'ios', repeat('x', 43)
  )$$,
  '42501', 'Active account required',
  'suspended account cannot register a push token'
);
select throws_ok(
  'select public.set_notification_settings(false, true, true, false)',
  '42501', 'Active account required',
  'suspended account cannot edit notification settings'
);
select throws_ok(
  $$select public.mark_invitation_opened(
    '00000000-0000-0000-0000-000000000099', 'screen'
  )$$,
  '42501', 'Active account required',
  'suspended account cannot mark invitation participation'
);
select ok(
  not has_function_privilege('authenticated', 'public.track_events(uuid,jsonb)', 'EXECUTE'),
  'authenticated clients cannot bypass the analytics Edge boundary'
);

select ok(public.export_my_data() is not null, 'suspended account may export');
select is(
  public.unregister_my_push_tokens(), 0,
  'suspended account may remove all push tokens'
);
select lives_ok(
  $$select public.submit_moderation_appeal(
    '00000000-0000-0000-0000-0000000000b1',
    'Please review this suspension.'
  )$$,
  'suspended account may submit an appeal'
);
select is(
  pg_temp.update_own_profile('Bypassed suspension'),
  0,
  'RLS blocks direct profile writes by a suspended account'
);

reset role;
update public.profiles set account_status = 'banned'
where id = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;

select is(
  public.current_account_status(), 'banned'::public.account_status,
  'banned status is visible to the account gate'
);
select throws_ok(
  $$select public.ask_question(
    '00000000-0000-0000-0000-000000000099', 'blocked question'
  )$$,
  '42501', 'Active account required',
  'banned account cannot participate'
);
select ok(public.can_submit_appeal(), 'banned account may appeal');

reset role;
update public.profiles set account_status = 'deletion_pending'
where id = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;

select is(public.can_submit_appeal(), false, 'deletion-pending account cannot appeal');
select throws_ok(
  $$select public.submit_moderation_appeal(
    '00000000-0000-0000-0000-000000000099', 'Please review this decision.'
  )$$,
  '42501', 'Appeal is not available for this account state',
  'appeal RPC enforces deletion-pending policy'
);
select throws_ok(
  'select public.assert_account_active()', '42501',
  'Active account required', 'deletion-pending account cannot participate'
);

reset role;
insert into auth.sessions (id, user_id)
values (
  '00000000-0000-0000-0000-0000000000b2',
  '00000000-0000-0000-0000-0000000000a1'
);
set local role service_role;
select is(
  public.revoke_account_sessions(
    '00000000-0000-0000-0000-0000000000a1', 0
  ),
  1,
  'Auth worker revokes refresh sessions for the current restricted state'
);
reset role;
select is(
  (select count(*)::integer from auth.sessions
   where user_id = '00000000-0000-0000-0000-0000000000a1'),
  0,
  'restricted account has no remaining refresh session'
);

-- Build a reported question and draft portrait for compound-action and direct
-- RLS tests.
reset role;
insert into public.daily_draws (
  id, selection_date, candidate_pool_hash, candidate_count, random_seed,
  selected_user_id, selection_status
) values (
  '00000000-0000-0000-0000-0000000000d1',
  current_date + 10, repeat('a', 64), 1, repeat('b', 64),
  '00000000-0000-0000-0000-0000000000a3', 'accepted'
);
insert into public.questions (id, draw_id, author_id, body, status)
values (
  '00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000000d1',
  '00000000-0000-0000-0000-0000000000a3',
  'A valid reported question?', 'approved'
);
insert into public.portraits (id, draw_id, user_id, status)
values (
  '00000000-0000-0000-0000-0000000000e1',
  '00000000-0000-0000-0000-0000000000d1',
  '00000000-0000-0000-0000-0000000000a3', 'draft'
);
insert into public.content_reports (
  id, reporter_id, target_type, target_id, reason, note
) values (
  '00000000-0000-0000-0000-0000000000c1',
  '00000000-0000-0000-0000-0000000000a1',
  'question', '00000000-0000-0000-0000-0000000000f1', 'spam',
  'Compound action fixture'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-0000000000a2',
  true
);
set local role authenticated;

select ok(public.is_moderator(), 'active moderator retains moderator capability');
select is(
  public.resolve_report_v2(
    '00000000-0000-0000-0000-0000000000c1',
    array['remove_content', 'suspend_account']::public.report_resolution_action[],
    'Remove and suspend test'
  ),
  true,
  'compound report action resolves successfully'
);

reset role;
select is(
  (select status::text from public.questions
   where id = '00000000-0000-0000-0000-0000000000f1'),
  'rejected', 'compound action removes the reported question'
);
select is(
  (select account_status from public.profiles
   where id = '00000000-0000-0000-0000-0000000000a3'),
  'suspended'::public.account_status,
  'compound action sanctions the reported content author'
);
select is(
  (select resolution_actions from public.content_reports
   where id = '00000000-0000-0000-0000-0000000000c1'),
  array['remove_content', 'suspend_account']::public.report_resolution_action[],
  'report stores every compound action'
);
select is(
  (
    select count(*)::integer from public.moderation_events
    where target_id in (
      '00000000-0000-0000-0000-0000000000f1',
      '00000000-0000-0000-0000-0000000000c1'
    ) or (
      subject_id = '00000000-0000-0000-0000-0000000000a3'
      and action = 'account_suspended'
    )
  ),
  3,
  'content removal, account sanction, and report resolution are all audited'
);
select is(
  (select count(*)::integer from public.account_enforcement_jobs
   where user_id = '00000000-0000-0000-0000-0000000000a3'),
  1,
  'account sanction creates one transactional Auth job'
);

set local role authenticated;
select is(
  public.set_account_status(
    '00000000-0000-0000-0000-0000000000a3', 'suspended', 'duplicate'
  ),
  true,
  'repeating the same account state is idempotent'
);
reset role;
select is(
  (select count(*)::integer from public.account_enforcement_jobs
   where user_id = '00000000-0000-0000-0000-0000000000a3'),
  1,
  'idempotent status update does not duplicate the outbox job'
);

set local role authenticated;
select is(
  public.set_account_status(
    '00000000-0000-0000-0000-0000000000a3', 'active', 'appeal restored'
  ),
  true,
  'moderator can restore an account'
);
reset role;
select is(
  (select account_status_version from public.profiles
   where id = '00000000-0000-0000-0000-0000000000a3'),
  2::bigint,
  'account status version increases monotonically'
);

set local role service_role;
select is(
  (select count(*)::integer from public.claim_account_enforcement_jobs(10)
   where user_id = '00000000-0000-0000-0000-0000000000a3'
     and target_status = 'active'),
  1,
  'worker claims only the current account-state version'
);
reset role;
select is(
  (select count(*)::integer from public.account_enforcement_jobs
   where user_id = '00000000-0000-0000-0000-0000000000a3'
     and last_error_code = 'superseded'),
  1,
  'worker marks stale account-state jobs superseded'
);

set local role service_role;
select ok(
  public.complete_account_enforcement_job(
    (select id from public.account_enforcement_jobs
     where user_id = '00000000-0000-0000-0000-0000000000a3'
       and status_version = 2)
  ),
  'worker completion is idempotent and explicit'
);
reset role;
select is(
  (select count(*)::integer from public.account_enforcement_jobs
   where user_id = '00000000-0000-0000-0000-0000000000a3'
     and completed_at is null),
  0,
  'no current Auth-enforcement job remains pending'
);

-- The target was restored above; suspend it directly to exercise RLS without
-- creating another worker job.
update public.profiles set account_status = 'suspended'
where id = '00000000-0000-0000-0000-0000000000a3';
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-0000000000a3',
  true
);
set local role authenticated;
select is(
  pg_temp.update_own_portrait(
    '00000000-0000-0000-0000-0000000000e1', 'bypass.jpg'
  ),
  0,
  'RLS blocks direct portrait writes by a suspended account'
);

reset role;
update public.profiles set account_status = 'banned'
where id = '00000000-0000-0000-0000-0000000000a2';
set local role authenticated;
select is(public.is_moderator(), false, 'banned moderator loses all moderator capability');
select throws_ok(
  $$select public.set_account_status(
    '00000000-0000-0000-0000-0000000000a3', 'active', 'forbidden'
  )$$,
  '42501', 'Not permitted',
  'banned moderator cannot change another account'
);

-- A report whose declared target type does not match its target row must stay
-- open and cannot sanction the unrelated question author.
reset role;
update public.profiles set account_status = 'active'
where id = '00000000-0000-0000-0000-0000000000a2';
insert into public.content_reports (
  id, reporter_id, target_type, target_id, reason
) values (
  '00000000-0000-0000-0000-0000000000c2',
  '00000000-0000-0000-0000-0000000000a1',
  'portrait', '00000000-0000-0000-0000-0000000000f1', 'spam'
);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-0000000000a2',
  true
);
set local role authenticated;
select throws_ok(
  $$select public.resolve_report_v2(
    '00000000-0000-0000-0000-0000000000c2',
    array['ban_account']::public.report_resolution_action[], null
  )$$,
  '23503', 'Reported target does not exist or has the wrong type',
  'compound resolver rejects a mismatched target type'
);
reset role;
select is(
  (select status::text from public.content_reports
   where id = '00000000-0000-0000-0000-0000000000c2'),
  'open', 'invalid report remains unresolved'
);

select * from finish();
rollback;
