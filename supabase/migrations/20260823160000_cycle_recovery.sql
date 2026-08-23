-- Phase 1 — recover pre-publication cycles without crossing the Quiet Day cutoff.

create or replace function public.quiet_day_cutoff(target_date date)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select (target_date::timestamp at time zone 'UTC') - interval '2 hours';
$$;

-- Being invited is not "having had your day". Cancelled cycles are retained
-- for audit, but must never remove a person from future equal-chance draws.
create or replace function public.is_eligible(candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.account_status = 'active'
    and p.wants_selection = true
    and p.selection_eligible = true
    and p.accepted_rules_at is not null
    and p.verification_level <> 'none'
    and p.birth_year <= (extract(year from now())::integer - 16)
    and not exists (
      select 1 from public.daily_draws d
      where d.selected_user_id = p.id
        and d.selection_status <> 'cancelled'
    )
  from public.profiles p
  where p.id = candidate_id;
$$;

create or replace function public.has_been_selected()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.daily_draws d
    where d.selected_user_id = (select auth.uid())
      and d.selection_status <> 'cancelled'
  );
$$;

create or replace function public.close_unfilled_cycle(
  target_draw uuid,
  close_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.draw_invitations
  set response = 'expired', responded_at = now()
  where draw_id = target_draw and response is null;

  update public.portraits
  set status = 'rejected',
      submitted_at = coalesce(submitted_at, now()),
      reviewed_at = coalesce(reviewed_at, now())
  where draw_id = target_draw and status <> 'rejected';

  update public.daily_draws
  set selection_status = 'cancelled'
  where id = target_draw
    and selection_status not in ('live', 'completed', 'cancelled');

  if found then
    insert into public.job_runs (job, ok, status, detail, completed_at)
    values (
      'cycle-recovery',
      true,
      'succeeded',
      'Quiet Day: ' || left(close_reason, 900),
      now()
    );
    return true;
  end if;

  return false;
end;
$$;

-- An emergency redraw uses the original frozen pool, minus everybody already
-- invited for that date. It never refreezes from current engagement or profile
-- activity, so chance remains the only ranking input.
create or replace function public.redraw_remaining_candidates(target_date date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_draw public.daily_draws;
  new_draw_id uuid;
  pool uuid[];
  pool_fingerprint text;
  seed text;
  ordered uuid[];
  next_version integer;
begin
  select * into current_draw
  from public.daily_draws
  where selection_date = target_date
    and selection_status <> 'cancelled'
  order by draw_version desc
  limit 1
  for update;

  if not found then
    return null;
  end if;

  select coalesce(array_agg(c.user_id order by c.user_id), '{}'::uuid[])
  into pool
  from public.draw_candidates c
  join public.profiles p on p.id = c.user_id
  where c.draw_id = current_draw.id
    and p.account_status = 'active'
    and p.wants_selection
    and not exists (
      select 1
      from public.draw_invitations i
      join public.daily_draws prior on prior.id = i.draw_id
      where prior.selection_date = target_date
        and i.user_id = c.user_id
    );

  pool_fingerprint := encode(
    extensions.digest(array_to_string(pool, ','), 'sha256'),
    'hex'
  );
  seed := encode(extensions.gen_random_bytes(32), 'hex');
  ordered := public.draw_order(seed, pool);

  select coalesce(max(draw_version), 0) + 1
  into next_version
  from public.daily_draws
  where selection_date = target_date;

  update public.daily_draws
  set selection_status = 'cancelled'
  where id = current_draw.id;

  insert into public.daily_draws (
    selection_date,
    draw_version,
    candidate_pool_hash,
    candidate_count,
    random_seed,
    selected_user_id,
    backup_1,
    backup_2,
    backup_3,
    selection_status
  ) values (
    target_date,
    next_version,
    pool_fingerprint,
    coalesce(array_length(pool, 1), 0),
    seed,
    ordered[1],
    ordered[2],
    ordered[3],
    ordered[4],
    case when ordered[1] is null then 'cancelled' else 'selected' end
      ::public.selection_status
  )
  returning id into new_draw_id;

  insert into public.draw_candidates (draw_id, user_id)
  select new_draw_id, unnest(pool);

  return new_draw_id;
end;
$$;

create or replace function public.escalate_draw(target_date date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_draw public.daily_draws;
  queue uuid[];
  next_candidate uuid;
  candidate_index integer;
begin
  select * into current_draw
  from public.daily_draws
  where selection_date = target_date
    and selection_status <> 'cancelled'
  order by draw_version desc
  limit 1
  for update;

  if not found then
    return null;
  end if;

  if now() >= public.quiet_day_cutoff(target_date) then
    perform public.close_unfilled_cycle(current_draw.id, '22:00 UTC cutoff reached');
    return null;
  end if;

  queue := array[current_draw.backup_1, current_draw.backup_2, current_draw.backup_3];

  for candidate_index in 1..3 loop
    if queue[candidate_index] is not null and exists (
      select 1 from public.profiles p
      where p.id = queue[candidate_index]
        and p.account_status = 'active'
        and p.wants_selection
    ) then
      next_candidate := queue[candidate_index];
      exit;
    end if;
  end loop;

  if next_candidate is null then
    return public.redraw_remaining_candidates(target_date);
  end if;

  update public.daily_draws
  set selected_user_id = next_candidate,
      backup_1 = queue[candidate_index + 1],
      backup_2 = queue[candidate_index + 2],
      backup_3 = null,
      selection_status = 'selected'
  where id = current_draw.id;

  return current_draw.id;
end;
$$;

create or replace function public.notify_selected_candidate(target_date date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_draw public.daily_draws;
  invitation_id uuid;
  candidate_position integer;
begin
  select * into current_draw
  from public.daily_draws
  where selection_date = target_date
    and selection_status in ('selected', 'replacement_required')
  order by draw_version desc
  limit 1
  for update;

  if not found or current_draw.selected_user_id is null then
    return null;
  end if;

  if now() >= public.quiet_day_cutoff(target_date) then
    perform public.close_unfilled_cycle(current_draw.id, 'candidate notification reached cutoff');
    return null;
  end if;

  select count(*) into candidate_position
  from public.draw_invitations
  where draw_id = current_draw.id;

  insert into public.draw_invitations (
    draw_id,
    user_id,
    position,
    acceptance_deadline
  ) values (
    current_draw.id,
    current_draw.selected_user_id,
    least(candidate_position, 3),
    least(now() + interval '12 hours', public.quiet_day_cutoff(target_date))
  )
  on conflict (draw_id, user_id) do nothing
  returning id into invitation_id;

  if invitation_id is not null then
    update public.daily_draws
    set selection_status = 'awaiting_acceptance'
    where id = current_draw.id;

    -- pg_net dispatches after this transaction commits, so it sees the new row.
    perform public.invoke_notifications_if_due();
  end if;

  return invitation_id;
end;
$$;

-- A tap on an actionable notification can race the five-minute expiry sweep.
-- Resolve that race inside the same row lock, never by trusting the client
-- timestamp. At and after 22:00 UTC the cycle becomes a Quiet Day.
create or replace function public.accept_selection()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation record;
begin
  select i.*, d.selection_date as cycle_date into invitation
  from public.draw_invitations i
  join public.daily_draws d on d.id = i.draw_id
  where i.user_id = (select auth.uid())
    and i.response is null
    and d.selection_status = 'awaiting_acceptance'
  order by i.notified_at desc
  limit 1
  for update of i, d;

  if not found then
    return false;
  end if;

  if invitation.acceptance_deadline <= now()
     or now() >= public.quiet_day_cutoff(invitation.cycle_date) then
    update public.draw_invitations
    set response = 'expired', responded_at = now()
    where id = invitation.id and response is null;

    if now() >= public.quiet_day_cutoff(invitation.cycle_date) then
      perform public.close_unfilled_cycle(
        invitation.draw_id,
        'acceptance arrived after the 22:00 UTC cutoff'
      );
    else
      perform public.escalate_draw(invitation.cycle_date);
      perform public.notify_selected_candidate(invitation.cycle_date);
    end if;
    return false;
  end if;

  update public.draw_invitations
  set response = 'accepted', responded_at = now()
  where id = invitation.id and response is null;

  update public.daily_draws
  set selection_status = 'accepted'
  where id = invitation.draw_id
    and selection_status = 'awaiting_acceptance';

  return found;
end;
$$;

create or replace function public.expire_stale_invitations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  stale record;
  expired_count integer := 0;
begin
  for stale in
    select i.id, i.draw_id, d.selection_date
    from public.draw_invitations i
    join public.daily_draws d on d.id = i.draw_id
    where i.response is null
      and i.acceptance_deadline <= now()
      and d.selection_status = 'awaiting_acceptance'
    for update of i
  loop
    update public.draw_invitations
    set response = 'expired', responded_at = now()
    where id = stale.id;

    if now() >= public.quiet_day_cutoff(stale.selection_date) then
      perform public.close_unfilled_cycle(stale.draw_id, 'invitation expired at cutoff');
    else
      perform public.escalate_draw(stale.selection_date);
      perform public.notify_selected_candidate(stale.selection_date);
    end if;

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

-- The cutoff also applies after acceptance: an unfinished draft or an aging
-- moderation review cannot drift into publication day. Ready portraits are
-- deliberately excluded because their cycle is filled and publishable.
create or replace function public.enforce_quiet_day_cutoff()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cycle record;
  closed integer := 0;
begin
  for cycle in
    select d.id, d.selection_date
    from public.daily_draws d
    where d.selection_date >= (now() at time zone 'utc')::date
      and d.selection_status in (
        'selected',
        'awaiting_acceptance',
        'accepted',
        'content_review',
        'replacement_required'
      )
      and now() >= public.quiet_day_cutoff(d.selection_date)
    for update
  loop
    if public.close_unfilled_cycle(
      cycle.id,
      'cycle was not ready at the 22:00 UTC cutoff'
    ) then
      closed := closed + 1;
    end if;
  end loop;

  return closed;
end;
$$;

-- ---------------------------------------------------------------------------
-- More than one candidate may attempt a cycle, but only one non-rejected
-- portrait may exist at a time. Rejected work stays as an audit record.
-- ---------------------------------------------------------------------------

alter table public.portraits drop constraint if exists portraits_draw_id_key;
create unique index portraits_one_current_per_draw
  on public.portraits (draw_id)
  where status <> 'rejected';

create or replace function public.start_my_portrait()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_draw uuid;
  portrait_id uuid;
begin
  select d.id into target_draw
  from public.daily_draws d
  where d.selected_user_id = (select auth.uid())
    and d.selection_status = 'accepted'
  order by d.selection_date desc
  limit 1;

  if target_draw is null then
    return null;
  end if;

  select p.id into portrait_id
  from public.portraits p
  where p.draw_id = target_draw
    and p.user_id = (select auth.uid())
    and p.status = 'draft'
  limit 1;

  if portrait_id is not null then
    return portrait_id;
  end if;

  insert into public.portraits (draw_id, user_id)
  values (target_draw, (select auth.uid()))
  on conflict do nothing
  returning id into portrait_id;

  return portrait_id;
end;
$$;

create or replace function public.recover_selected_draw(
  target_draw uuid,
  unavailable_user uuid,
  recovery_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  cycle_date date;
begin
  select d.selection_date into cycle_date
  from public.daily_draws d
  where d.id = target_draw
    and d.selected_user_id = unavailable_user
    and d.selection_status in (
      'selected',
      'awaiting_acceptance',
      'accepted',
      'content_review',
      'ready',
      'replacement_required'
    )
  for update;

  if cycle_date is null then
    return false;
  end if;

  update public.draw_invitations
  set response = 'expired', responded_at = now()
  where draw_id = target_draw
    and user_id = unavailable_user
    and response is null;

  update public.portraits
  set status = 'rejected',
      submitted_at = coalesce(submitted_at, now()),
      reviewed_at = coalesce(reviewed_at, now())
  where draw_id = target_draw
    and user_id = unavailable_user
    and status <> 'rejected';

  if now() >= public.quiet_day_cutoff(cycle_date) then
    perform public.close_unfilled_cycle(target_draw, recovery_reason);
  else
    perform public.escalate_draw(cycle_date);
    perform public.notify_selected_candidate(cycle_date);
  end if;

  insert into public.job_runs (job, ok, status, detail, completed_at)
  values ('cycle-recovery', true, 'succeeded', left(recovery_reason, 1000), now());

  return true;
end;
$$;

create or replace function public.recover_selected_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected record;
  target_id uuid := coalesce(old.id, new.id);
  reason text;
begin
  if tg_op = 'UPDATE' then
    if new.account_status = 'active' and new.wants_selection then
      return new;
    end if;
    reason := case
      when new.account_status <> 'active' then 'selected account became unavailable'
      else 'selected person left the selection pool'
    end;
  else
    reason := 'selected account was deleted before publication';
  end if;

  for affected in
    select d.id
    from public.daily_draws d
    where d.selected_user_id = target_id
      and d.selection_status in (
        'selected',
        'awaiting_acceptance',
        'accepted',
        'content_review',
        'ready',
        'replacement_required'
      )
  loop
    perform public.recover_selected_draw(affected.id, target_id, reason);
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_recover_selected_update on public.profiles;
create trigger profiles_recover_selected_update
  after update of wants_selection, account_status on public.profiles
  for each row
  when (
    (old.wants_selection and not new.wants_selection)
    or (old.account_status = 'active' and new.account_status <> 'active')
  )
  execute function public.recover_selected_user();

drop trigger if exists profiles_recover_selected_delete on public.profiles;
create trigger profiles_recover_selected_delete
  before delete on public.profiles
  for each row execute function public.recover_selected_user();

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

  update public.portraits
  set status = case when decision = 'approved' then 'approved' else 'rejected' end
        ::public.portrait_status,
      reviewed_at = now()
  where id = target_portrait;

  if decision = 'approved' then
    update public.daily_draws
    set selection_status = 'ready'
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

  if decision = 'rejected' then
    perform public.recover_selected_draw(
      target_draw,
      subject,
      coalesce(review_reason, 'portrait rejected during moderation')
    );
  end if;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Synchronous cycle jobs record the function outcome inside the same database
-- ---------------------------------------------------------------------------

create or replace function public.run_daily_draw_job()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_date date := (now() at time zone 'utc')::date + 2;
  draw_id uuid;
begin
  draw_id := public.run_daily_draw(target_date);
  insert into public.job_runs (job, ok, status, detail, completed_at)
  values ('daily-draw', true, 'succeeded', 'Draw ' || draw_id::text, now());
  return draw_id;
exception when others then
  insert into public.job_runs (job, ok, status, detail, completed_at)
  values ('daily-draw', false, 'failed', left(sqlerrm, 1000), now());
  return null;
end;
$$;

create or replace function public.notify_selected_candidate_job()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_date date := (now() at time zone 'utc')::date + 2;
  invitation_id uuid;
  cycle_status public.selection_status;
begin
  invitation_id := public.notify_selected_candidate(target_date);
  select d.selection_status into cycle_status
  from public.daily_draws d
  where d.selection_date = target_date
  order by d.draw_version desc limit 1;

  insert into public.job_runs (job, ok, status, detail, completed_at)
  values (
    'candidate-invitation',
    invitation_id is not null or cycle_status = 'cancelled',
    case when invitation_id is not null or cycle_status = 'cancelled'
      then 'succeeded' else 'failed' end,
    case when invitation_id is not null then 'Invitation created'
      when cycle_status = 'cancelled' then 'Quiet Day: no candidate'
      else 'No invitation was created' end,
    now()
  );
  return invitation_id;
exception when others then
  insert into public.job_runs (job, ok, status, detail, completed_at)
  values ('candidate-invitation', false, 'failed', left(sqlerrm, 1000), now());
  return null;
end;
$$;

create or replace function public.publish_due_cycles_job()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  published integer;
  cycle_status public.selection_status;
  today date := (now() at time zone 'utc')::date;
begin
  published := public.publish_due_cycles();
  select d.selection_status into cycle_status
  from public.daily_draws d
  where d.selection_date = today
  order by d.draw_version desc limit 1;

  insert into public.job_runs (job, ok, status, detail, completed_at)
  values (
    'publish-cycle',
    cycle_status in ('live', 'cancelled'),
    case when cycle_status in ('live', 'cancelled') then 'succeeded' else 'failed' end,
    case when cycle_status = 'live' then 'Published ' || published::text || ' cycle'
      when cycle_status = 'cancelled' then 'Quiet Day published'
      when cycle_status is null then 'No draw exists for today'
      else 'Cycle remained in state ' || cycle_status::text end,
    now()
  );
  return published;
exception when others then
  insert into public.job_runs (job, ok, status, detail, completed_at)
  values ('publish-cycle', false, 'failed', left(sqlerrm, 1000), now());
  return 0;
end;
$$;

create or replace function public.expire_invitations_job()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired integer;
  quiet_days integer;
begin
  expired := public.expire_stale_invitations();
  quiet_days := public.enforce_quiet_day_cutoff();
  if expired > 0 or quiet_days > 0 then
    insert into public.job_runs (job, ok, status, detail, completed_at)
    values (
      'expire-invitations', true, 'succeeded',
      expired::text || ' invitation(s) expired and recovered; '
        || quiet_days::text || ' Quiet Day cycle(s) closed',
      now()
    );
  end if;
  return expired + quiet_days;
exception when others then
  insert into public.job_runs (job, ok, status, detail, completed_at)
  values ('expire-invitations', false, 'failed', left(sqlerrm, 1000), now());
  return 0;
end;
$$;

revoke execute on function public.quiet_day_cutoff(date)
  from public, anon, authenticated;
revoke execute on function public.close_unfilled_cycle(uuid, text)
  from public, anon, authenticated;
revoke execute on function public.redraw_remaining_candidates(date)
  from public, anon, authenticated;
revoke execute on function public.recover_selected_draw(uuid, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.recover_selected_user()
  from public, anon, authenticated;
revoke execute on function public.enforce_quiet_day_cutoff()
  from public, anon, authenticated;
revoke execute on function public.run_daily_draw_job()
  from public, anon, authenticated;
revoke execute on function public.notify_selected_candidate_job()
  from public, anon, authenticated;
revoke execute on function public.publish_due_cycles_job()
  from public, anon, authenticated;
revoke execute on function public.expire_invitations_job()
  from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname)
    from cron.job
    where jobname in (
      'onehuman-daily-draw',
      'onehuman-notify-candidate',
      'onehuman-expire-invitations',
      'onehuman-publish'
    );

    perform cron.schedule(
      'onehuman-daily-draw', '0 0 * * *',
      'select public.run_daily_draw_job()'
    );
    perform cron.schedule(
      'onehuman-notify-candidate', '10 0 * * *',
      'select public.notify_selected_candidate_job()'
    );
    perform cron.schedule(
      'onehuman-expire-invitations', '*/5 * * * *',
      'select public.expire_invitations_job()'
    );
    perform cron.schedule(
      'onehuman-publish', '1 0 * * *',
      'select public.publish_due_cycles_job()'
    );
  end if;
exception when others then
  insert into public.job_runs (job, ok, status, detail, completed_at)
  values ('schedule-cycle', false, 'failed', left(sqlerrm, 1000), now());
end;
$$;
