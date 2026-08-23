-- BUG FIX — the whole moderation path was broken, for the same reason.
--
-- A CASE with two literal branches resolves to `text`, and Postgres will not
-- assign text to an enum without an explicit cast. Six such expressions were
-- written in Phase 9, so:
--
--   review_portrait     could never approve or reject a portrait
--   review_question     could never approve or reject a question
--   resolve_report      could never resolve a report
--   set_account_status  could never suspend or ban an account
--
-- Which means no portrait could ever be approved, so publish_due_cycles had
-- nothing to publish, so no cycle could ever go live. Together with the same
-- bug in run_daily_draw, the product's entire pipeline was non-functional.
--
-- 465 tests passed throughout. They read the migrations as text and check what
-- the SQL *says*; none of them execute it. That is a real limit of the
-- approach, and scripts/simulate-cycle.mjs exists to cover it — it found all of
-- this on its first two runs.

create or replace function public.review_portrait(
  target_portrait uuid,
  decision public.moderation_decision,
  review_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_draw uuid;
  subject uuid;
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  select p.draw_id, p.user_id into target_draw, subject
  from public.portraits p
  where p.id = target_portrait
    and p.status in ('submitted', 'in_review');

  if target_draw is null then
    return false;
  end if;

  if decision = 'approved' then
    update public.portraits
    set status = 'approved', reviewed_at = now()
    where id = target_portrait;

    update public.daily_draws
    set selection_status = 'ready'
    where id = target_draw;
  else
    update public.portraits
    set status = 'rejected', reviewed_at = now()
    where id = target_portrait;

    -- A rejected portrait leaves the cycle unfilled. The escalation path
    -- already knows what to do with that.
    update public.daily_draws
    set selection_status = 'replacement_required'
    where id = target_draw;
  end if;

  insert into public.moderation_decisions (
    target_type, target_id, decision, decided_by, reason
  ) values (
    'portrait', target_portrait, decision, (select auth.uid()), review_reason
  )
  on conflict (target_type, target_id) do update
    set decision = excluded.decision,
        decided_by = excluded.decided_by,
        reason = excluded.reason,
        decided_at = now();

  insert into public.moderation_events (
    actor_id, action, target_type, target_id, subject_id, reason
  ) values (
    (select auth.uid()),
    (case
      when decision = 'approved' then 'portrait_approved'
      else 'portrait_rejected'
    end)::public.moderation_action,
    'portrait',
    target_portrait,
    subject,
    review_reason
  );

  return true;
end;
$$;

create or replace function public.review_question(
  target_question uuid,
  decision public.moderation_decision,
  review_reason text default null
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
  set status = (case
      when decision = 'approved' then 'approved'
      else 'rejected'
    end)::public.question_status
  where id = target_question
    and status = 'pending'
  returning author_id into subject;

  if subject is null then
    return false;
  end if;

  insert into public.moderation_events (
    actor_id, action, target_type, target_id, subject_id, reason
  ) values (
    (select auth.uid()),
    (case
      when decision = 'approved' then 'question_approved'
      else 'question_rejected'
    end)::public.moderation_action,
    'question',
    target_question,
    subject,
    review_reason
  );

  return true;
end;
$$;

create or replace function public.resolve_report(
  target_report uuid,
  actioned boolean,
  resolution_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  update public.content_reports
  set status = (case when actioned then 'actioned' else 'dismissed' end)
      ::public.report_status,
      resolved_at = now(),
      resolved_by = (select auth.uid())
  where id = target_report
    and status = 'open';

  if not found then
    return false;
  end if;

  insert into public.moderation_events (
    actor_id, action, target_type, target_id, reason
  ) values (
    (select auth.uid()),
    (case
      when actioned then 'report_actioned'
      else 'report_dismissed'
    end)::public.moderation_action,
    'profile',
    target_report,
    resolution_note
  );

  return true;
end;
$$;

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
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  update public.profiles
  set account_status = new_status,
      -- A suspended or banned account leaves the pool immediately. The nightly
      -- refresh would do it too, but not before tomorrow's freeze.
      selection_eligible = (new_status = 'active' and selection_eligible)
  where id = target_user;

  if not found then
    return false;
  end if;

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

  return true;
end;
$$;

revoke execute on function
  public.review_portrait(uuid, public.moderation_decision, text) from public, anon;
revoke execute on function
  public.review_question(uuid, public.moderation_decision, text) from public, anon;
revoke execute on function public.resolve_report(uuid, boolean, text)
  from public, anon;
revoke execute on function
  public.set_account_status(uuid, public.account_status, text) from public, anon;

grant execute on function
  public.review_portrait(uuid, public.moderation_decision, text) to authenticated;
grant execute on function
  public.review_question(uuid, public.moderation_decision, text) to authenticated;
grant execute on function public.resolve_report(uuid, boolean, text)
  to authenticated;
grant execute on function
  public.set_account_status(uuid, public.account_status, text) to authenticated;
