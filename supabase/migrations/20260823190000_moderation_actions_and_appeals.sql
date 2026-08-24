-- Phase 2 -- moderation that changes the product, not just a queue label.

create type public.report_resolution_action as enum (
  'dismiss', 'remove_content', 'suspend_account', 'ban_account'
);

alter table public.content_reports
  add column resolution_action public.report_resolution_action,
  add column resolution_note text,
  add constraint content_reports_resolution_note_length check (
    resolution_note is null or char_length(resolution_note) <= 1000
  );

-- ---------------------------------------------------------------------------
-- Direct content controls, including content that was already approved
-- ---------------------------------------------------------------------------

create or replace function public.remove_question(
  target_question uuid,
  removal_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  subject uuid;
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  update public.questions
  set status = 'rejected'
  where id = target_question and status in ('pending', 'approved')
  returning author_id into subject;

  if subject is null then return false; end if;

  insert into public.moderation_events (
    actor_id, action, target_type, target_id, subject_id, reason
  ) values (
    (select auth.uid()), 'question_rejected', 'question',
    target_question, subject, removal_reason
  );

  insert into public.moderation_decisions (
    target_type, target_id, decision, decided_by, reason
  ) values (
    'question', target_question, 'rejected', (select auth.uid()), removal_reason
  )
  on conflict (target_type, target_id) do update set
    decision = excluded.decision,
    decided_by = excluded.decided_by,
    reason = excluded.reason,
    decided_at = now();

  return true;
end;
$$;

create or replace function public.redact_portrait(
  target_portrait uuid,
  removal_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_draw uuid;
  subject uuid;
  draw_status public.selection_status;
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  select p.draw_id, p.user_id, d.selection_status
  into target_draw, subject, draw_status
  from public.portraits p
  join public.daily_draws d on d.id = p.draw_id
  where p.id = target_portrait;

  if target_draw is null then return false; end if;

  if draw_status in ('live', 'completed') then
    update public.daily_draws set
      redacted_at = coalesce(redacted_at, now()),
      redacted_by = (select auth.uid()),
      redaction_reason = removal_reason
    where id = target_draw;
  else
    update public.portraits set status = 'rejected', reviewed_at = now()
    where id = target_portrait and status <> 'rejected';

    update public.daily_draws set selection_status = 'replacement_required'
    where id = target_draw
      and selection_status not in ('cancelled', 'live', 'completed');
  end if;

  insert into public.moderation_events (
    actor_id, action, target_type, target_id, subject_id, reason
  ) values (
    (select auth.uid()),
    case when draw_status in ('live', 'completed')
      then 'archive_redacted'::public.moderation_action
      else 'portrait_rejected'::public.moderation_action
    end,
    'portrait', target_portrait, subject, removal_reason
  );

  insert into public.moderation_decisions (
    target_type, target_id, decision, decided_by, reason
  ) values (
    'portrait', target_portrait, 'rejected', (select auth.uid()), removal_reason
  )
  on conflict (target_type, target_id) do update set
    decision = excluded.decision,
    decided_by = excluded.decided_by,
    reason = excluded.reason,
    decided_at = now();

  return true;
end;
$$;

revoke execute on function public.remove_question(uuid, text) from public, anon;
revoke execute on function public.redact_portrait(uuid, text) from public, anon;
grant execute on function public.remove_question(uuid, text) to authenticated;
grant execute on function public.redact_portrait(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Reports resolve to an explicit effect
-- ---------------------------------------------------------------------------

drop function if exists public.resolve_report(uuid, boolean, text);

create or replace function public.resolve_report(
  target_report uuid,
  resolution public.report_resolution_action,
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
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  select c.target_type, c.target_id
  into report_target_type, report_target_id
  from public.content_reports c
  where c.id = target_report and c.status = 'open'
  for update;

  if report_target_id is null then return false; end if;

  case report_target_type
    when 'question' then
      select q.author_id into subject from public.questions q where q.id = report_target_id;
    when 'portrait' then
      select p.user_id into subject from public.portraits p where p.id = report_target_id;
    when 'profile' then
      select p.id into subject from public.profiles p where p.id = report_target_id;
  end case;

  if resolution = 'remove_content' then
    if report_target_type = 'question' then
      changed := public.remove_question(report_target_id, resolution_note);
    elsif report_target_type = 'portrait' then
      changed := public.redact_portrait(report_target_id, resolution_note);
    else
      raise exception 'Profiles require an account action' using errcode = 'check_violation';
    end if;
    if not coalesce(changed, false) then
      raise exception 'Target could not be removed' using errcode = 'no_data_found';
    end if;
  elsif resolution = 'suspend_account' then
    if subject is null or not public.set_account_status(subject, 'suspended', resolution_note) then
      raise exception 'Target account does not exist' using errcode = 'no_data_found';
    end if;
  elsif resolution = 'ban_account' then
    if subject is null or not public.set_account_status(subject, 'banned', resolution_note) then
      raise exception 'Target account does not exist' using errcode = 'no_data_found';
    end if;
  end if;

  update public.content_reports set
    status = case when resolution = 'dismiss'
      then 'dismissed'::public.report_status else 'actioned'::public.report_status end,
    resolution_action = resolution,
    resolution_note = nullif(btrim(coalesce(resolve_report.resolution_note, '')), ''),
    resolved_at = now(),
    resolved_by = (select auth.uid())
  where id = target_report;

  insert into public.moderation_events (
    actor_id, action, target_type, target_id, subject_id, reason
  ) values (
    (select auth.uid()),
    case when resolution = 'dismiss'
      then 'report_dismissed'::public.moderation_action
      else 'report_actioned'::public.moderation_action end,
    report_target_type, report_target_id, subject,
    concat(resolution::text, case when resolution_note is null then '' else ': ' || resolution_note end)
  );

  return true;
end;
$$;

revoke execute on function
  public.resolve_report(uuid, public.report_resolution_action, text)
  from public, anon;
grant execute on function
  public.resolve_report(uuid, public.report_resolution_action, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Complete queues: moderators see the thing they are judging
-- ---------------------------------------------------------------------------

drop function if exists public.moderation_portrait_queue();
drop function if exists public.moderation_question_queue();
drop function if exists public.moderation_report_queue();

create or replace function public.moderation_portrait_queue()
returns table (
  portrait_id uuid,
  draw_id uuid,
  selection_date date,
  display_name text,
  country_code char(2),
  photo_path text,
  media_path text,
  submitted_at timestamptz,
  verification_level public.verification_level,
  open_reports integer,
  responses jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id, p.draw_id, d.selection_date, pr.display_name, pr.country_code,
    p.photo_path, p.media_path, p.submitted_at, pr.verification_level,
    (select count(*)::integer from public.content_reports c
      where c.target_type = 'portrait' and c.target_id = p.id and c.status = 'open'),
    coalesce((select jsonb_agg(jsonb_build_object(
      'element_key', e.element_key, 'answer', e.answer
    ) order by e.element_key) from public.portrait_elements e
      where e.portrait_id = p.id), '[]'::jsonb)
  from public.portraits p
  join public.daily_draws d on d.id = p.draw_id
  join public.profiles pr on pr.id = p.user_id
  where public.is_moderator() and p.status in ('submitted', 'in_review')
  order by d.selection_date, p.submitted_at;
$$;

create or replace function public.moderation_question_queue()
returns table (
  question_id uuid,
  draw_id uuid,
  body text,
  created_at timestamptz,
  auto_flags text,
  author_display_name text,
  human_number integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    q.id, q.draw_id, q.body, q.created_at,
    (select string_agg(e.reason, ', ') from public.moderation_events e
      where e.target_type = 'question' and e.target_id = q.id
        and e.action = 'auto_flagged'),
    pr.display_name,
    d.human_number
  from public.questions q
  join public.profiles pr on pr.id = q.author_id
  join public.daily_draws d on d.id = q.draw_id
  where public.is_moderator() and q.status = 'pending'
  order by q.created_at;
$$;

create or replace function public.moderation_report_queue()
returns table (
  report_id uuid,
  target_type public.report_target,
  target_id uuid,
  reason public.report_reason,
  note text,
  created_at timestamptz,
  target_content text,
  target_photo_path text,
  subject_display_name text,
  subject_account_status public.account_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id, c.target_type, c.target_id, c.reason, c.note, c.created_at,
    case c.target_type
      when 'question' then (select q.body from public.questions q where q.id = c.target_id)
      when 'portrait' then (select string_agg(e.answer, E'\n\n' order by e.element_key)
        from public.portrait_elements e where e.portrait_id = c.target_id)
      when 'profile' then (select p.bio_short from public.profiles p where p.id = c.target_id)
    end,
    case when c.target_type = 'portrait'
      then (select p.photo_path from public.portraits p where p.id = c.target_id) end,
    subject_profile.display_name,
    subject_profile.account_status
  from public.content_reports c
  left join lateral (
    select p.display_name, p.account_status
    from public.profiles p
    where p.id = case c.target_type
      when 'question' then (select q.author_id from public.questions q where q.id = c.target_id)
      when 'portrait' then (select po.user_id from public.portraits po where po.id = c.target_id)
      when 'profile' then c.target_id
    end
  ) subject_profile on true
  where public.is_moderator() and c.status = 'open'
  order by c.created_at;
$$;

revoke execute on function public.moderation_portrait_queue() from public, anon;
revoke execute on function public.moderation_question_queue() from public, anon;
revoke execute on function public.moderation_report_queue() from public, anon;
grant execute on function public.moderation_portrait_queue() to authenticated;
grant execute on function public.moderation_question_queue() to authenticated;
grant execute on function public.moderation_report_queue() to authenticated;

-- ---------------------------------------------------------------------------
-- Appeals and Archive-removal moderation queues
-- ---------------------------------------------------------------------------

create or replace function public.moderation_appeal_queue()
returns table (
  appeal_id uuid,
  action public.moderation_action,
  target_type public.report_target,
  target_id uuid,
  original_reason text,
  statement text,
  appellant_display_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id, e.action, e.target_type, e.target_id, e.reason,
    a.statement, p.display_name, a.created_at
  from public.moderation_appeals a
  join public.moderation_events e on e.id = a.original_event_id
  left join public.profiles p on p.id = a.appellant_id
  where public.is_moderator()
    and a.status = 'pending'
    and (a.original_moderator_id is null or a.original_moderator_id <> (select auth.uid()))
  order by a.created_at;
$$;

create or replace function public.review_moderation_appeal(
  target_appeal uuid,
  overturned boolean,
  review_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  original_id uuid;
  original_actor uuid;
  original_action public.moderation_action;
  original_target_id uuid;
  appellant uuid;
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  select e.id, e.actor_id, e.action, e.target_id, a.appellant_id
  into original_id, original_actor, original_action, original_target_id, appellant
  from public.moderation_appeals a
  join public.moderation_events e on e.id = a.original_event_id
  where a.id = target_appeal and a.status = 'pending'
  for update of a;

  if original_id is null then return false; end if;
  if original_actor = (select auth.uid()) then
    raise exception 'Appeals require a different moderator'
      using errcode = 'insufficient_privilege';
  end if;

  update public.moderation_appeals set
    status = (case when overturned then 'overturned' else 'upheld' end)
      ::public.appeal_status,
    resolved_at = now(), resolved_by = (select auth.uid()),
    resolution_note = nullif(btrim(coalesce(review_note, '')), '')
  where id = target_appeal;

  if overturned then
    if original_action in ('account_suspended', 'account_banned') then
      perform public.set_account_status(appellant, 'active', review_note);
    elsif original_action = 'question_rejected' and original_target_id is not null then
      update public.questions set status = 'approved' where id = original_target_id;
      insert into public.moderation_decisions (
        target_type, target_id, decision, decided_by, reason
      ) values (
        'question', original_target_id, 'approved', (select auth.uid()), review_note
      ) on conflict (target_type, target_id) do update set
        decision = excluded.decision,
        decided_by = excluded.decided_by,
        reason = excluded.reason,
        decided_at = now();
      insert into public.moderation_events (
        actor_id, action, target_type, target_id, subject_id, reason
      ) values (
        (select auth.uid()), 'question_approved', 'question',
        original_target_id, appellant, review_note
      );
    elsif original_action = 'archive_redacted' and original_target_id is not null then
      update public.daily_draws d set
        redacted_at = null, redacted_by = null, redaction_reason = null
      from public.portraits p
      where p.id = original_target_id and d.id = p.draw_id
        and d.selected_user_id = appellant;
      insert into public.moderation_decisions (
        target_type, target_id, decision, decided_by, reason
      ) values (
        'portrait', original_target_id, 'approved', (select auth.uid()), review_note
      ) on conflict (target_type, target_id) do update set
        decision = excluded.decision,
        decided_by = excluded.decided_by,
        reason = excluded.reason,
        decided_at = now();
      insert into public.moderation_events (
        actor_id, action, target_type, target_id, subject_id, reason
      ) values (
        (select auth.uid()), 'portrait_approved', 'portrait',
        original_target_id, appellant, review_note
      );
    end if;
  end if;

  insert into public.moderation_events (
    actor_id, action, target_id, subject_id, reason
  ) values (
    (select auth.uid()),
    (case when overturned then 'appeal_overturned' else 'appeal_upheld' end)
      ::public.moderation_action,
    target_appeal, appellant, review_note
  );

  return true;
end;
$$;

create or replace function public.moderation_archive_removal_queue()
returns table (
  request_id uuid,
  draw_id uuid,
  portrait_id uuid,
  human_number integer,
  selection_date date,
  display_name text,
  reason text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.draw_id, po.id, d.human_number, d.selection_date,
    p.display_name, r.reason, r.created_at
  from public.archive_removal_requests r
  join public.daily_draws d on d.id = r.draw_id
  left join public.portraits po on po.draw_id = d.id
  left join public.profiles p on p.id = r.requester_id
  where public.is_moderator() and r.status = 'pending'
  order by r.created_at;
$$;

create or replace function public.review_archive_removal(
  target_request uuid,
  approved boolean,
  review_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_draw uuid;
  target_portrait uuid;
  requester uuid;
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  select r.draw_id, p.id, r.requester_id into target_draw, target_portrait, requester
  from public.archive_removal_requests r
  left join public.portraits p on p.draw_id = r.draw_id
  where r.id = target_request and r.status = 'pending'
  for update of r;

  if target_draw is null then return false; end if;

  if approved then
    perform public.redact_portrait(target_portrait, coalesce(review_note, 'Archive removal request'));
  end if;

  update public.archive_removal_requests set
    status = (case when approved then 'approved' else 'declined' end)
      ::public.archive_removal_status,
    resolved_at = now(), resolved_by = (select auth.uid()),
    resolution_note = nullif(btrim(coalesce(review_note, '')), '')
  where id = target_request;

  insert into public.moderation_events (
    actor_id, action, target_id, subject_id, reason
  ) values (
    (select auth.uid()),
    (case when approved then 'archive_removal_approved'
      else 'archive_removal_declined' end)::public.moderation_action,
    target_request, requester, review_note
  );

  return true;
end;
$$;

revoke execute on function public.moderation_appeal_queue() from public, anon;
revoke execute on function public.review_moderation_appeal(uuid, boolean, text)
  from public, anon;
revoke execute on function public.moderation_archive_removal_queue()
  from public, anon;
revoke execute on function public.review_archive_removal(uuid, boolean, text)
  from public, anon;
grant execute on function public.moderation_appeal_queue() to authenticated;
grant execute on function public.review_moderation_appeal(uuid, boolean, text)
  to authenticated;
grant execute on function public.moderation_archive_removal_queue()
  to authenticated;
grant execute on function public.review_archive_removal(uuid, boolean, text)
  to authenticated;
