begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '88000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'phase8@example.com', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now()
);
insert into public.profiles (
  id, username, display_name, country_code, birth_year, wants_selection,
  accepted_rules_at
) values (
  '88000000-0000-4000-8000-000000000001', 'phase8_user',
  'Phase Eight', 'DE', 1990, true, now()
);

insert into public.daily_draws (
  id, selection_date, candidate_pool_hash, selected_user_id, selection_status,
  random_seed, candidate_count
) values (
  '88000000-0000-4000-8000-000000000010', current_date,
  repeat('8', 64), '88000000-0000-4000-8000-000000000001',
  'accepted', repeat('7', 64), 1
);
insert into public.portraits (id, draw_id, user_id, photo_path)
values (
  '88000000-0000-4000-8000-000000000020',
  '88000000-0000-4000-8000-000000000010',
  '88000000-0000-4000-8000-000000000001',
  '88000000-0000-4000-8000-000000000001/portrait.jpg'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '88000000-0000-4000-8000-000000000001', true);

select is(
  public.save_my_portrait_answer(
    '88000000-0000-4000-8000-000000000020', 'introduction',
    'A sufficiently long first answer.', 0
  ), 1::bigint, 'the first autosave advances its persistent revision'
);
select throws_ok(
  $$select public.save_my_portrait_answer(
    '88000000-0000-4000-8000-000000000020', 'introduction',
    'A stale answer that must never win.', 0)$$,
  '40001', 'Portrait answer changed on another request',
  'a stale autosave cannot overwrite the newer answer'
);
select is(
  public.save_my_portrait_answer(
    '88000000-0000-4000-8000-000000000020', 'introduction', '', 1
  ), 2::bigint, 'clearing an answer advances the revision'
);
select throws_ok(
  $$select public.save_my_portrait_answer(
    '88000000-0000-4000-8000-000000000020', 'introduction',
    'An old write cannot recreate cleared text.', 1)$$,
  '40001', 'Portrait answer changed on another request',
  'an old autosave cannot recreate a cleared answer'
);

select ok(public.save_answers_and_submit_my_portrait(
  '88000000-0000-4000-8000-000000000020',
  '{"introduction":"Here is a concise introduction.","where_im_from":"A place that shaped how I see people.","today_i_feel":"Today I feel ready to listen carefully.","something_i_love":"I love ordinary meals shared with friends.","something_misunderstood":"Quietness is not the same as indifference.","ordinary_moment":"","something_id_tell_the_world":""}'::jsonb,
  '{"introduction":2,"where_im_from":0,"today_i_feel":0,"something_i_love":0,"something_misunderstood":0,"ordinary_moment":0,"something_id_tell_the_world":0}'::jsonb
), 'saving the final snapshot and submission is atomic');
select is(
  (select status::text from public.portraits where id = '88000000-0000-4000-8000-000000000020'),
  'submitted', 'the atomic RPC submits the exact saved snapshot'
);

select ok(public.patch_notification_setting('daily', true), 'daily is patched');
select ok(public.patch_notification_setting('anniversary', true), 'anniversary is patched independently');
select ok(
  (select daily and selected and answered and anniversary
   from public.get_notification_settings()),
  'independent patches preserve the other settings'
);
select throws_ok(
  $$select public.patch_notification_setting('marketing', true)$$,
  '23514', 'Invalid notification setting',
  'unknown notification categories fail closed'
);

select lives_ok(
  $$select public.request_attestation_review()$$,
  'an attestation failure has a recoverable human-review path'
);
select ok(
  (select review_pending from public.profiles
   where id = '88000000-0000-4000-8000-000000000001'),
  'requesting review visibly pauses eligibility'
);

select * from finish();
rollback;
