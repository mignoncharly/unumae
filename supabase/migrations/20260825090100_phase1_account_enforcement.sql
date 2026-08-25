-- Roadmap v2 Phase 1 -- suspension and ban enforcement.
--
-- The database is the security boundary. Client routing is useful feedback,
-- but every prohibited mutation is refused here even when PostgREST is called
-- directly with a still-valid JWT.

-- ---------------------------------------------------------------------------
-- 1. One account-state policy
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column account_status_version bigint not null default 0;

comment on column public.profiles.account_status_version is
  'Monotonic version used to order Auth-enforcement jobs. Not user writable.';

create or replace function public.current_account_status()
returns public.account_status
language sql
stable
security definer
set search_path = ''
as $$
  select p.account_status
  from public.profiles p
  where p.id = (select auth.uid());
$$;

create or replace function public.assert_authenticated()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required'
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;

create or replace function public.assert_account_active()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  status public.account_status;
begin
  perform public.assert_authenticated();
  status := public.current_account_status();

  if status is distinct from 'active'::public.account_status then
    raise exception 'Active account required'
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;

create or replace function public.can_submit_appeal()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and public.current_account_status() in (
      'active'::public.account_status,
      'suspended'::public.account_status,
      'banned'::public.account_status
    );
$$;

revoke execute on function public.current_account_status() from public, anon;
revoke execute on function public.assert_authenticated() from public, anon;
revoke execute on function public.assert_account_active() from public, anon;
revoke execute on function public.can_submit_appeal() from public, anon;
grant execute on function public.current_account_status() to authenticated;
grant execute on function public.assert_authenticated() to authenticated;
grant execute on function public.assert_account_active() to authenticated;
grant execute on function public.can_submit_appeal() to authenticated;

-- A moderator retains no privileged capability while suspended or banned.
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.moderators m
    join public.profiles p on p.id = m.user_id
    where m.user_id = (select auth.uid())
      and p.account_status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Guard every authenticated participation RPC
-- ---------------------------------------------------------------------------
--
-- Renaming preserves the already-tested implementation OID while removing its
-- client grant. The public contract is recreated as a small guard that calls
-- the original implementation only after account-state enforcement.

alter function public.accept_community_rules()
  rename to accept_community_rules_phase0;
revoke execute on function public.accept_community_rules_phase0()
  from public, anon, authenticated;
create function public.accept_community_rules()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.accept_community_rules_phase0();
end;
$$;

alter function public.accept_selection() rename to accept_selection_phase0;
revoke execute on function public.accept_selection_phase0()
  from public, anon, authenticated;
create function public.accept_selection()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.accept_selection_phase0();
end;
$$;

alter function public.decline_selection() rename to decline_selection_phase0;
revoke execute on function public.decline_selection_phase0()
  from public, anon, authenticated;
create function public.decline_selection()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.decline_selection_phase0();
end;
$$;

alter function public.start_my_portrait() rename to start_my_portrait_phase0;
revoke execute on function public.start_my_portrait_phase0()
  from public, anon, authenticated;
create function public.start_my_portrait()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.start_my_portrait_phase0();
end;
$$;

alter function public.submit_my_portrait() rename to submit_my_portrait_phase0;
revoke execute on function public.submit_my_portrait_phase0()
  from public, anon, authenticated;
create function public.submit_my_portrait()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.submit_my_portrait_phase0();
end;
$$;

alter function public.answer_question(uuid, text)
  rename to answer_question_phase0;
revoke execute on function public.answer_question_phase0(uuid, text)
  from public, anon, authenticated;
create function public.answer_question(target_question uuid, answer_body text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.answer_question_phase0(target_question, answer_body);
end;
$$;

alter function public.ask_question(uuid, text) rename to ask_question_phase0;
revoke execute on function public.ask_question_phase0(uuid, text)
  from public, anon, authenticated;
create function public.ask_question(target_draw uuid, question_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.ask_question_phase0(target_draw, question_body);
end;
$$;

alter function public.vote_question(uuid) rename to vote_question_phase0;
revoke execute on function public.vote_question_phase0(uuid)
  from public, anon, authenticated;
create function public.vote_question(target_question uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.vote_question_phase0(target_question);
end;
$$;

alter function public.unvote_question(uuid) rename to unvote_question_phase0;
revoke execute on function public.unvote_question_phase0(uuid)
  from public, anon, authenticated;
create function public.unvote_question(target_question uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.unvote_question_phase0(target_question);
end;
$$;

alter function public.remember_human(uuid) rename to remember_human_phase0;
revoke execute on function public.remember_human_phase0(uuid)
  from public, anon, authenticated;
create function public.remember_human(target_draw uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.remember_human_phase0(target_draw);
end;
$$;

alter function public.forget_human(uuid) rename to forget_human_phase0;
revoke execute on function public.forget_human_phase0(uuid)
  from public, anon, authenticated;
create function public.forget_human(target_draw uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.forget_human_phase0(target_draw);
end;
$$;

alter function public.report_content(
  public.report_target, uuid, public.report_reason, text
) rename to report_content_phase0;
revoke execute on function public.report_content_phase0(
  public.report_target, uuid, public.report_reason, text
) from public, anon, authenticated;
create function public.report_content(
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
begin
  perform public.assert_account_active();
  return public.report_content_phase0(
    report_target_type, report_target_id, report_reason, report_note
  );
end;
$$;

alter function public.block_content_author(public.report_target, uuid)
  rename to block_content_author_phase0;
revoke execute on function public.block_content_author_phase0(
  public.report_target, uuid
) from public, anon, authenticated;
create function public.block_content_author(
  target_type public.report_target,
  target_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.block_content_author_phase0(target_type, target_id);
end;
$$;

alter function public.unblock_by_id(uuid) rename to unblock_by_id_phase0;
revoke execute on function public.unblock_by_id_phase0(uuid)
  from public, anon, authenticated;
create function public.unblock_by_id(target_block uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.unblock_by_id_phase0(target_block);
end;
$$;

alter function public.request_archive_removal(uuid, text)
  rename to request_archive_removal_phase0;
revoke execute on function public.request_archive_removal_phase0(uuid, text)
  from public, anon, authenticated;
create function public.request_archive_removal(
  target_draw uuid,
  request_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.request_archive_removal_phase0(target_draw, request_reason);
end;
$$;

alter function public.register_push_token(text, public.push_platform)
  rename to register_push_token_phase0;
revoke execute on function public.register_push_token_phase0(
  text, public.push_platform
) from public, anon, authenticated;
create function public.register_push_token(
  push_token text,
  device_platform public.push_platform
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.register_push_token_phase0(push_token, device_platform);
end;
$$;

alter function public.set_notification_settings(boolean, boolean, boolean, boolean)
  rename to set_notification_settings_phase0;
revoke execute on function public.set_notification_settings_phase0(
  boolean, boolean, boolean, boolean
) from public, anon, authenticated;
-- The Phase 0 implementation qualified its parameters with the function name.
-- Renaming the function therefore requires recreating that internal body with
-- its new name; otherwise PL/pgSQL resolves the old qualifier as a table.
create or replace function public.set_notification_settings_phase0(
  daily boolean,
  selected boolean,
  answered boolean,
  anniversary boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_settings as s (
    user_id, daily, selected, answered, anniversary, updated_at
  ) values (
    (select auth.uid()),
    set_notification_settings_phase0.daily,
    set_notification_settings_phase0.selected,
    set_notification_settings_phase0.answered,
    set_notification_settings_phase0.anniversary,
    now()
  )
  on conflict (user_id) do update
    set daily = excluded.daily,
        selected = excluded.selected,
        answered = excluded.answered,
        anniversary = excluded.anniversary,
        updated_at = now();

  return true;
end;
$$;
create function public.set_notification_settings(
  daily boolean,
  selected boolean,
  answered boolean,
  anniversary boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.set_notification_settings_phase0(
    daily, selected, answered, anniversary
  );
end;
$$;

alter function public.mark_invitation_opened(uuid, text)
  rename to mark_invitation_opened_phase0;
revoke execute on function public.mark_invitation_opened_phase0(uuid, text)
  from public, anon, authenticated;
create function public.mark_invitation_opened(
  target_invitation uuid,
  open_source text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_account_active();
  return public.mark_invitation_opened_phase0(target_invitation, open_source);
end;
$$;

-- Guest analytics remain available. An authenticated event is participation
-- tied to an account and therefore requires that account to be active.
alter function public.track_events(uuid, jsonb) rename to track_events_phase0;
revoke execute on function public.track_events_phase0(uuid, jsonb)
  from public, anon, authenticated;
create function public.track_events(batch_install_id uuid, batch jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    perform public.assert_account_active();
  end if;
  return public.track_events_phase0(batch_install_id, batch);
end;
$$;

grant execute on function public.accept_community_rules() to authenticated;
grant execute on function public.accept_selection() to authenticated;
grant execute on function public.decline_selection() to authenticated;
grant execute on function public.start_my_portrait() to authenticated;
grant execute on function public.submit_my_portrait() to authenticated;
grant execute on function public.answer_question(uuid, text) to authenticated;
grant execute on function public.ask_question(uuid, text) to authenticated;
grant execute on function public.vote_question(uuid) to authenticated;
grant execute on function public.unvote_question(uuid) to authenticated;
grant execute on function public.remember_human(uuid) to authenticated;
grant execute on function public.forget_human(uuid) to authenticated;
grant execute on function public.report_content(
  public.report_target, uuid, public.report_reason, text
) to authenticated;
grant execute on function public.block_content_author(
  public.report_target, uuid
) to authenticated;
grant execute on function public.unblock_by_id(uuid) to authenticated;
grant execute on function public.request_archive_removal(uuid, text)
  to authenticated;
grant execute on function public.register_push_token(
  text, public.push_platform
) to authenticated;
grant execute on function public.set_notification_settings(
  boolean, boolean, boolean, boolean
) to authenticated;
grant execute on function public.mark_invitation_opened(uuid, text)
  to authenticated;
grant execute on function public.track_events(uuid, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Guard direct PostgREST and Storage writes
-- ---------------------------------------------------------------------------

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own_active
  on public.profiles for update
  to authenticated
  using (
    (select auth.uid()) = id
    and public.current_account_status() = 'active'
  )
  with check (
    (select auth.uid()) = id
    and public.current_account_status() = 'active'
  );

drop policy if exists portraits_update_own_draft on public.portraits;
create policy portraits_update_own_active_draft
  on public.portraits for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status = 'draft'
    and public.current_account_status() = 'active'
  )
  with check (
    (select auth.uid()) = user_id
    and status = 'draft'
    and public.current_account_status() = 'active'
  );

drop policy if exists portrait_elements_own on public.portrait_elements;
create policy portrait_elements_own_active
  on public.portrait_elements for all
  to authenticated
  using (
    public.current_account_status() = 'active'
    and exists (
      select 1 from public.portraits p
      where p.id = portrait_id and p.user_id = (select auth.uid())
    )
  )
  with check (
    public.current_account_status() = 'active'
    and exists (
      select 1 from public.portraits p
      where p.id = portrait_id
        and p.user_id = (select auth.uid())
        and p.status = 'draft'
    )
  );

drop policy if exists storage_avatars_own on storage.objects;
create policy storage_avatars_own
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_account_status() = 'active'
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_account_status() = 'active'
  );

drop policy if exists storage_portraits_own on storage.objects;
create policy storage_portraits_own
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'portraits'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_account_status() = 'active'
  )
  with check (
    bucket_id = 'portraits'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_account_status() = 'active'
  );

-- ---------------------------------------------------------------------------
-- 4. Compound report resolution with target/author validation
-- ---------------------------------------------------------------------------

alter table public.content_reports
  add column resolution_actions public.report_resolution_action[]
    not null default '{}';

update public.content_reports
set resolution_actions = array[resolution_action]
where resolution_action is not null;

create or replace function public.resolve_report_v2(
  target_report uuid,
  actions public.report_resolution_action[],
  resolution_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_target_type public.report_target;
  report_target_id uuid;
  subject uuid;
  changed boolean;
  effective_actions public.report_resolution_action[] := actions;
  legacy_action public.report_resolution_action;
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  if actions is null or cardinality(actions) < 1 or cardinality(actions) > 2 then
    raise exception 'Choose one or two report actions'
      using errcode = 'check_violation';
  end if;

  if cardinality(actions) <> (
    select count(distinct action) from unnest(actions) action
  ) then
    raise exception 'Report actions must be unique'
      using errcode = 'check_violation';
  end if;

  if 'dismiss' = any(actions) and cardinality(actions) <> 1 then
    raise exception 'Dismiss cannot be combined with another action'
      using errcode = 'check_violation';
  end if;

  if 'suspend_account' = any(actions) and 'ban_account' = any(actions) then
    raise exception 'Choose either suspension or ban'
      using errcode = 'check_violation';
  end if;

  select c.target_type, c.target_id
  into report_target_type, report_target_id
  from public.content_reports c
  where c.id = target_report and c.status = 'open'
  for update;

  if report_target_id is null then
    return false;
  end if;

  case report_target_type
    when 'question' then
      select q.author_id into subject
      from public.questions q where q.id = report_target_id;
    when 'portrait' then
      select p.user_id into subject
      from public.portraits p where p.id = report_target_id;
    when 'profile' then
      select p.id into subject
      from public.profiles p where p.id = report_target_id;
  end case;

  if subject is null then
    raise exception 'Reported target does not exist or has the wrong type'
      using errcode = 'foreign_key_violation';
  end if;

  if report_target_type = 'profile' and 'remove_content' = any(actions) then
    raise exception 'Profiles require an account action'
      using errcode = 'check_violation';
  end if;

  -- A ban arising from a content report removes that reported content by
  -- default. Historical content elsewhere is deliberately left untouched.
  if report_target_type <> 'profile'
     and 'ban_account' = any(effective_actions)
     and not ('remove_content' = any(effective_actions)) then
    effective_actions := array_append(
      effective_actions, 'remove_content'::public.report_resolution_action
    );
  end if;

  if 'remove_content' = any(effective_actions) then
    if report_target_type = 'question' then
      changed := public.remove_question(report_target_id, resolution_note);
    else
      changed := public.redact_portrait(report_target_id, resolution_note);
    end if;
    if not coalesce(changed, false) then
      raise exception 'Reported content could not be removed'
        using errcode = 'no_data_found';
    end if;
  end if;

  if 'suspend_account' = any(effective_actions) then
    if not public.set_account_status(subject, 'suspended', resolution_note) then
      raise exception 'Target account does not exist'
        using errcode = 'no_data_found';
    end if;
  elsif 'ban_account' = any(effective_actions) then
    if not public.set_account_status(subject, 'banned', resolution_note) then
      raise exception 'Target account does not exist'
        using errcode = 'no_data_found';
    end if;
  end if;

  legacy_action := (case
    when 'ban_account' = any(effective_actions) then 'ban_account'
    when 'suspend_account' = any(effective_actions) then 'suspend_account'
    when 'remove_content' = any(effective_actions) then 'remove_content'
    else 'dismiss'
  end)::public.report_resolution_action;

  update public.content_reports
  set status = case when 'dismiss' = any(effective_actions)
        then 'dismissed'::public.report_status
        else 'actioned'::public.report_status
      end,
      resolution_action = legacy_action,
      resolution_actions = effective_actions,
      resolution_note = nullif(btrim(coalesce(resolve_report_v2.resolution_note, '')), ''),
      resolved_at = now(),
      resolved_by = (select auth.uid())
  where id = target_report;

  insert into public.moderation_events (
    actor_id, action, target_type, target_id, subject_id, reason
  ) values (
    (select auth.uid()),
    case when 'dismiss' = any(effective_actions)
      then 'report_dismissed'::public.moderation_action
      else 'report_actioned'::public.moderation_action
    end,
    report_target_type,
    report_target_id,
    subject,
    concat(
      array_to_string(effective_actions, ','),
      case when resolution_note is null then '' else ': ' || resolution_note end
    )
  );

  return true;
end;
$$;

revoke execute on function public.resolve_report_v2(
  uuid, public.report_resolution_action[], text
) from public, anon;
grant execute on function public.resolve_report_v2(
  uuid, public.report_resolution_action[], text
) to authenticated;
-- The v1 contract cannot express a compound action and must not remain a
-- bypass for report-specific ban semantics.
revoke execute on function public.resolve_report(
  uuid, public.report_resolution_action, text
) from authenticated;

-- ---------------------------------------------------------------------------
-- 5. Transactional Auth-enforcement outbox
-- ---------------------------------------------------------------------------

create table public.account_enforcement_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_status public.account_status not null,
  status_version bigint not null,
  idempotency_key text not null unique,
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_enforcement_attempts_nonnegative check (attempt_count >= 0),
  constraint account_enforcement_error_code_length check (
    last_error_code is null or char_length(last_error_code) <= 80
  ),
  unique (user_id, status_version)
);

create index account_enforcement_jobs_pending
  on public.account_enforcement_jobs (available_at, created_at)
  where completed_at is null;

alter table public.account_enforcement_jobs enable row level security;
revoke all on public.account_enforcement_jobs from anon, authenticated;

create or replace function public.set_account_status(
  target_user uuid,
  new_status public.account_status,
  status_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_status public.account_status;
  next_version bigint;
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  if new_status not in ('active', 'suspended', 'banned') then
    raise exception 'Moderators may only activate, suspend, or ban accounts'
      using errcode = 'check_violation';
  end if;

  select p.account_status, p.account_status_version
  into old_status, next_version
  from public.profiles p
  where p.id = target_user
  for update;

  if not found then
    return false;
  end if;

  if old_status = new_status then
    return true;
  end if;

  next_version := next_version + 1;

  update public.profiles
  set account_status = new_status,
      account_status_version = next_version,
      selection_eligible = false
  where id = target_user;

  insert into public.moderation_events (
    actor_id, action, subject_id, reason
  ) values (
    (select auth.uid()),
    (case new_status
      when 'suspended' then 'account_suspended'
      when 'banned' then 'account_banned'
      else 'account_reinstated'
    end)::public.moderation_action,
    target_user,
    status_reason
  );

  insert into public.account_enforcement_jobs (
    user_id, target_status, status_version, idempotency_key
  ) values (
    target_user,
    new_status,
    next_version,
    target_user::text || ':' || next_version::text
  );

  return true;
end;
$$;

create or replace function public.claim_account_enforcement_jobs(
  limit_rows integer default 10
)
returns table (
  job_id uuid,
  user_id uuid,
  target_status public.account_status,
  status_version bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Old jobs are completed without touching Auth. This makes rapid
  -- suspend -> restore -> ban transitions deterministic.
  update public.account_enforcement_jobs j
  set completed_at = now(),
      locked_at = null,
      last_error_code = 'superseded',
      updated_at = now()
  from public.profiles p
  where j.user_id = p.id
    and j.completed_at is null
    and j.status_version < p.account_status_version;

  return query
  with candidates as (
    select j.id
    from public.account_enforcement_jobs j
    join public.profiles p on p.id = j.user_id
    where j.completed_at is null
      and j.status_version = p.account_status_version
      and j.target_status = p.account_status
      and j.attempt_count < 10
      and j.available_at <= now()
      and (j.locked_at is null or j.locked_at < now() - interval '5 minutes')
    order by j.created_at
    for update of j skip locked
    limit greatest(least(limit_rows, 50), 0)
  )
  update public.account_enforcement_jobs j
  set locked_at = now(),
      attempt_count = j.attempt_count + 1,
      updated_at = now()
  from candidates c
  where j.id = c.id
  returning j.id, j.user_id, j.target_status, j.status_version;
end;
$$;

create or replace function public.complete_account_enforcement_job(target_job uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.account_enforcement_jobs
  set completed_at = now(),
      locked_at = null,
      last_error_code = null,
      updated_at = now()
  where id = target_job and completed_at is null;
  return found;
end;
$$;

create or replace function public.fail_account_enforcement_job(
  target_job uuid,
  error_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.account_enforcement_jobs
  set locked_at = null,
      available_at = now() + make_interval(
        secs => least(300, greatest(5, (2 ^ least(attempt_count, 8))::integer))
      ),
      last_error_code = left(
        coalesce(nullif(btrim(error_code), ''), 'auth_update_failed'), 80
      ),
      updated_at = now()
  where id = target_job and completed_at is null;
  return found;
end;
$$;

create or replace function public.revoke_account_sessions(
  target_user uuid,
  target_status_version bigint
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  -- Refuse stale worker deliveries and never revoke a restored account.
  if not exists (
    select 1 from public.profiles p
    where p.id = target_user
      and p.account_status_version = target_status_version
      and p.account_status <> 'active'
  ) then
    return 0;
  end if;

  -- refresh_tokens cascade from auth.sessions. Existing short-lived access
  -- JWTs remain harmless because every prohibited database mutation is already
  -- blocked; re-authentication stays available for appeal/export/deletion.
  delete from auth.sessions s where s.user_id = target_user;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function public.set_account_status(
  uuid, public.account_status, text
) from public, anon;
grant execute on function public.set_account_status(
  uuid, public.account_status, text
) to authenticated;

revoke execute on function public.claim_account_enforcement_jobs(integer)
  from public, anon, authenticated;
revoke execute on function public.complete_account_enforcement_job(uuid)
  from public, anon, authenticated;
revoke execute on function public.fail_account_enforcement_job(uuid, text)
  from public, anon, authenticated;
revoke execute on function public.revoke_account_sessions(uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.claim_account_enforcement_jobs(integer)
  to service_role;
grant execute on function public.complete_account_enforcement_job(uuid)
  to service_role;
grant execute on function public.fail_account_enforcement_job(uuid, text)
  to service_role;
grant execute on function public.revoke_account_sessions(uuid, bigint)
  to service_role;

-- Appeals intentionally bypass assert_account_active(). They are available to
-- active, suspended, and banned accounts, but not once deletion is pending.
create or replace function public.submit_moderation_appeal(
  target_event uuid,
  appeal_statement text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  original_moderator uuid;
  appeal_id uuid;
  clean_statement text := btrim(appeal_statement);
begin
  if not public.can_submit_appeal() then
    raise exception 'Appeal is not available for this account state'
      using errcode = 'insufficient_privilege';
  end if;

  if char_length(clean_statement) < 10 or char_length(clean_statement) > 1000 then
    raise exception 'Appeal statement must be between 10 and 1000 characters'
      using errcode = 'check_violation';
  end if;

  select e.actor_id into original_moderator
  from public.moderation_events e
  where e.id = target_event
    and e.subject_id = (select auth.uid())
    and e.action in (
      'question_rejected', 'account_suspended', 'account_banned',
      'archive_redacted'
    );

  if not found then
    raise exception 'Decision is not appealable'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.moderation_appeals (
    appellant_id, original_event_id, original_moderator_id, statement
  ) values (
    (select auth.uid()), target_event, original_moderator, clean_statement
  ) returning id into appeal_id;

  return appeal_id;
end;
$$;

-- Retry delivery every minute. invoke_function records dispatch failures in
-- job_runs; the outbox keeps the authoritative per-account retry state.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname)
    from cron.job
    where jobname = 'unumae-account-enforcement';

    perform cron.schedule(
      'unumae-account-enforcement',
      '* * * * *',
      'select public.invoke_function(''enforce-account-status'')'
    );
  end if;
exception
  when others then
    raise notice 'Could not schedule account enforcement: %', sqlerrm;
end;
$$;

comment on table public.account_enforcement_jobs is
  'Transactional outbox for applying profile account status to Supabase Auth. Error fields contain stable codes only.';
comment on function public.resolve_report_v2 is
  'Resolves a report with dismiss, content removal, account sanction, or a compound removal plus sanction.';
