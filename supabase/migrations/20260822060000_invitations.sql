-- Phase 5 — candidate notification and the acceptance window
--
-- Article 5.5 gives a selected candidate 12 hours to accept, and Article 5.6
-- makes declining a legitimate one-tap action with no penalty. Neither is
-- expressible today: escalate_draw() shifts selected_user_id up the queue, so
-- the record of who was actually asked is overwritten every time.
--
-- This table is that record. It exists so the product can prove it asked, and
-- so that silence can be treated as silence rather than as refusal.

create type public.invitation_response as enum (
  'accepted',
  'declined',
  -- The deadline passed with no answer. Explicitly not the same as 'declined':
  -- not everyone checks their phone (Article 5.5).
  'expired'
);

create table public.draw_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  draw_id uuid not null references public.daily_draws (id) on delete cascade,

  -- Cascades on account deletion: an invitation is personal data, unlike the
  -- draw row itself, which survives as a tombstone (Article 8.6).
  user_id uuid not null references public.profiles (id) on delete cascade,

  -- 0 = primary, 1..3 = backups, in the order the draw produced.
  position integer not null,

  notified_at timestamptz not null default now(),
  acceptance_deadline timestamptz not null,
  responded_at timestamptz,
  response public.invitation_response,

  created_at timestamptz not null default now(),

  constraint draw_invitations_unique_person unique (draw_id, user_id),
  constraint draw_invitations_position_range check (position between 0 and 3),
  constraint draw_invitations_response_consistent check (
    (response is null and responded_at is null)
    or (response is not null and responded_at is not null)
  )
);

comment on table public.draw_invitations is
  'Who was asked, when, and what they answered. Proves the product asked, and keeps silence distinct from refusal.';

create index idx_draw_invitations_pending
  on public.draw_invitations (acceptance_deadline)
  where response is null;

create index idx_draw_invitations_user on public.draw_invitations (user_id);

alter table public.draw_invitations enable row level security;

-- ---------------------------------------------------------------------------
-- Notifying the current candidate
-- ---------------------------------------------------------------------------
--
-- The message at this point is "You were selected." — never "You are Today's
-- Human", because nothing has been written or reviewed yet. Getting that wrong
-- would publish a promise the product has not yet kept.

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
    and selection_status <> 'cancelled'
  order by draw_version desc
  limit 1;

  if not found or current_draw.selected_user_id is null then
    return null;
  end if;

  -- How many people we have already been through for this cycle. The primary
  -- is position 0; each escalation moves one further down the original order.
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
    -- Article 5.5 — 12 hours, from the moment we asked.
    now() + interval '12 hours'
  )
  on conflict (draw_id, user_id) do nothing
  returning id into invitation_id;

  update public.daily_draws
  set selection_status = 'awaiting_acceptance'
  where id = current_draw.id;

  return invitation_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- The candidate's answer
-- ---------------------------------------------------------------------------

create or replace function public.accept_selection()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.draw_invitations;
begin
  select i.* into invitation
  from public.draw_invitations i
  join public.daily_draws d on d.id = i.draw_id
  where i.user_id = (select auth.uid())
    and i.response is null
    and d.selection_status = 'awaiting_acceptance'
  order by i.notified_at desc
  limit 1;

  if not found then
    return false;
  end if;

  -- An expired invitation cannot be accepted late: by then the next candidate
  -- has been asked, and two accepted humans for one cycle is the one thing
  -- Article 1.6 forbids outright.
  if invitation.acceptance_deadline < now() then
    return false;
  end if;

  update public.draw_invitations
  set response = 'accepted', responded_at = now()
  where id = invitation.id;

  update public.daily_draws
  set selection_status = 'accepted'
  where id = invitation.draw_id;

  return true;
end;
$$;

create or replace function public.decline_selection()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.draw_invitations;
  target_date date;
begin
  select i.* into invitation
  from public.draw_invitations i
  join public.daily_draws d on d.id = i.draw_id
  where i.user_id = (select auth.uid())
    and i.response is null
    and d.selection_status = 'awaiting_acceptance'
  order by i.notified_at desc
  limit 1;

  if not found then
    return false;
  end if;

  update public.draw_invitations
  set response = 'declined', responded_at = now()
  where id = invitation.id;

  select selection_date into target_date
  from public.daily_draws
  where id = invitation.draw_id;

  -- Article 5.6: the next backup is notified immediately rather than waiting
  -- out a deadline the candidate has already answered.
  perform public.escalate_draw(target_date);
  perform public.notify_selected_candidate(target_date);

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Silence
-- ---------------------------------------------------------------------------

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
    select i.id, d.selection_date
    from public.draw_invitations i
    join public.daily_draws d on d.id = i.draw_id
    where i.response is null
      and i.acceptance_deadline < now()
      and d.selection_status = 'awaiting_acceptance'
  loop
    update public.draw_invitations
    set response = 'expired', responded_at = now()
    where id = stale.id;

    -- No penalty is recorded anywhere. The person stays in future pools
    -- exactly as they were (Article 5.5).
    perform public.escalate_draw(stale.selection_date);
    perform public.notify_selected_candidate(stale.selection_date);

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- What the candidate can see
-- ---------------------------------------------------------------------------
--
-- Returns the caller's own pending invitation and nothing else. It takes no
-- argument, so it cannot be asked about anybody else, and it exposes the cycle
-- date without exposing who else was in the queue.

create or replace function public.my_pending_invitation()
returns table (
  invitation_id uuid,
  selection_date date,
  notified_at timestamptz,
  acceptance_deadline timestamptz,
  selection_status public.selection_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.id,
    d.selection_date,
    i.notified_at,
    i.acceptance_deadline,
    d.selection_status
  from public.draw_invitations i
  join public.daily_draws d on d.id = i.draw_id
  where i.user_id = (select auth.uid())
    and i.response is null
    and i.acceptance_deadline > now()
    and d.selection_status in ('awaiting_acceptance', 'accepted')
  order by i.notified_at desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.draw_invitations from anon, authenticated;

-- Read-only, and only your own. Answering happens through the RPCs so that the
-- state machine stays in one place and cannot be driven from a client.
grant select on public.draw_invitations to authenticated;

create policy draw_invitations_select_own
  on public.draw_invitations for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke execute on function public.notify_selected_candidate(date)
  from anon, authenticated;
revoke execute on function public.expire_stale_invitations() from anon, authenticated;

grant execute on function public.accept_selection() to authenticated;
grant execute on function public.decline_selection() to authenticated;
grant execute on function public.my_pending_invitation() to authenticated;
