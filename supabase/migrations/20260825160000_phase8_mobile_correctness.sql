-- Phase 8 — mobile correctness and recoverable device attestation.

-- Per-answer revisions survive an answer being cleared, preventing the ABA
-- case where an old in-flight write recreates text after a newer delete.
create table public.portrait_element_revisions (
  portrait_id uuid not null references public.portraits (id) on delete cascade,
  element_key public.portrait_element_key not null,
  revision bigint not null default 0 check (revision >= 0),
  primary key (portrait_id, element_key)
);

alter table public.portrait_element_revisions enable row level security;
revoke all on public.portrait_element_revisions from public, anon, authenticated;

insert into public.portrait_element_revisions (portrait_id, element_key, revision)
select e.portrait_id, e.element_key, 1
from public.portrait_elements e
on conflict do nothing;

create function public.get_my_portrait_answer_revisions(target_portrait uuid)
returns table (element_key public.portrait_element_key, revision bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select keys.element_key, coalesce(r.revision, 0)
  from unnest(enum_range(null::public.portrait_element_key)) keys(element_key)
  left join public.portrait_element_revisions r
    on r.portrait_id = target_portrait and r.element_key = keys.element_key
  where exists (
    select 1 from public.portraits p
    where p.id = target_portrait and p.user_id = (select auth.uid())
  );
$$;

create function public.save_my_portrait_answer(
  target_portrait uuid,
  target_key public.portrait_element_key,
  target_answer text,
  expected_revision bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_revision bigint;
  trimmed_answer text := btrim(coalesce(target_answer, ''));
  current_answer text;
begin
  perform public.assert_account_active();

  if expected_revision < 0 then
    raise exception 'Invalid portrait answer revision'
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.portraits p
    where p.id = target_portrait
      and p.user_id = (select auth.uid())
      and p.status = 'draft'
  ) then
    raise exception 'Portrait draft not found' using errcode = 'no_data_found';
  end if;

  insert into public.portrait_element_revisions (portrait_id, element_key)
  values (target_portrait, target_key)
  on conflict do nothing;

  select r.revision into current_revision
  from public.portrait_element_revisions r
  where r.portrait_id = target_portrait and r.element_key = target_key
  for update;

  if current_revision <> expected_revision then
    raise exception 'Portrait answer changed on another request'
      using errcode = 'serialization_failure';
  end if;

  select e.answer into current_answer
  from public.portrait_elements e
  where e.portrait_id = target_portrait and e.element_key = target_key;

  if trimmed_answer = '' then
    if current_answer is not null then
      delete from public.portrait_elements e
      where e.portrait_id = target_portrait and e.element_key = target_key;
    else
      return current_revision;
    end if;
  elsif current_answer is distinct from trimmed_answer then
    insert into public.portrait_elements (portrait_id, element_key, answer)
    values (target_portrait, target_key, trimmed_answer)
    on conflict (portrait_id, element_key) do update
      set answer = excluded.answer;
  else
    return current_revision;
  end if;

  update public.portrait_element_revisions r
  set revision = revision + 1
  where r.portrait_id = target_portrait and r.element_key = target_key
  returning revision into current_revision;

  return current_revision;
end;
$$;

-- The submitted snapshot and the state transition happen in one transaction.
-- Any stale answer aborts the complete statement, leaving the draft editable.
create function public.save_answers_and_submit_my_portrait(
  target_portrait uuid,
  submitted_answers jsonb,
  expected_revisions jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  portrait public.portraits;
  answer_key public.portrait_element_key;
  expected bigint;
  answered integer;
begin
  perform public.assert_account_active();

  if jsonb_typeof(submitted_answers) <> 'object'
     or jsonb_typeof(expected_revisions) <> 'object' then
    raise exception 'Invalid portrait snapshot' using errcode = 'check_violation';
  end if;

  select p.* into portrait
  from public.portraits p
  where p.id = target_portrait
    and p.user_id = (select auth.uid())
    and p.status = 'draft'
  for update;

  if not found then
    return false;
  end if;

  if portrait.photo_path is null then
    raise exception 'A portrait needs a photograph'
      using errcode = 'check_violation';
  end if;

  for answer_key in select unnest(enum_range(null::public.portrait_element_key))
  loop
    if not (expected_revisions ? answer_key::text)
       or jsonb_typeof(expected_revisions -> answer_key::text) <> 'number' then
      raise exception 'Missing portrait answer revision'
        using errcode = 'check_violation';
    end if;

    expected := (expected_revisions ->> answer_key::text)::bigint;
    perform public.save_my_portrait_answer(
      target_portrait,
      answer_key,
      coalesce(submitted_answers ->> answer_key::text, ''),
      expected
    );
  end loop;

  select count(*) into answered
  from public.portrait_elements e
  where e.portrait_id = target_portrait and btrim(e.answer) <> '';

  if answered < 5 then
    raise exception 'Answer at least five prompts before submitting'
      using errcode = 'check_violation';
  end if;

  update public.portraits p
  set status = 'submitted', submitted_at = now()
  where p.id = target_portrait;

  update public.daily_draws d
  set selection_status = 'content_review'
  where d.id = portrait.draw_id;

  return true;
end;
$$;

-- One switch per call means rapid changes to different settings cannot restore
-- stale values for the other three switches.
create function public.patch_notification_setting(
  setting_name text,
  setting_value boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();

  if setting_name not in ('daily', 'selected', 'answered', 'anniversary') then
    raise exception 'Invalid notification setting' using errcode = 'check_violation';
  end if;

  insert into public.notification_settings (user_id)
  values ((select auth.uid()))
  on conflict (user_id) do nothing;

  update public.notification_settings s
  set daily = case when setting_name = 'daily' then setting_value else s.daily end,
      selected = case when setting_name = 'selected' then setting_value else s.selected end,
      answered = case when setting_name = 'answered' then setting_value else s.answered end,
      anniversary = case when setting_name = 'anniversary' then setting_value else s.anniversary end,
      updated_at = now()
  where s.user_id = (select auth.uid());

  return true;
end;
$$;

-- Unsupported/refurbished/shared devices need a visible human-review path.
-- The existing integrity operations queue and append-only decision log own the
-- review; this RPC only creates one idempotent, privacy-preserving signal.
create function public.request_attestation_review()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid := (select auth.uid());
  flag_id uuid;
begin
  perform public.assert_account_active();

  flag_id := public.raise_account_signal(
    target_user,
    'attestation_review_requested',
    extensions.digest(target_user::text, 'sha256'),
    'The account owner requested human review after device attestation could not complete.'
  );
  perform public.recompute_account_assurance(target_user);
  return flag_id;
end;
$$;

revoke execute on function public.save_my_portrait_answer(
  uuid, public.portrait_element_key, text, bigint
) from public, anon;
revoke execute on function public.get_my_portrait_answer_revisions(uuid)
  from public, anon;
revoke execute on function public.save_answers_and_submit_my_portrait(
  uuid, jsonb, jsonb
) from public, anon;
revoke execute on function public.patch_notification_setting(text, boolean)
  from public, anon;
revoke execute on function public.request_attestation_review()
  from public, anon;

grant execute on function public.save_my_portrait_answer(
  uuid, public.portrait_element_key, text, bigint
) to authenticated;
grant execute on function public.get_my_portrait_answer_revisions(uuid)
  to authenticated;
grant execute on function public.save_answers_and_submit_my_portrait(
  uuid, jsonb, jsonb
) to authenticated;
grant execute on function public.patch_notification_setting(text, boolean)
  to authenticated;
grant execute on function public.request_attestation_review()
  to authenticated;
