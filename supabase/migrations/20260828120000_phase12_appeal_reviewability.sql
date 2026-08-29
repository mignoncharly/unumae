-- Phase 12 — make an unreviewable appeal visible.
--
-- `review_moderation_appeal` refuses when the reviewer is the moderator who
-- made the original decision, and `moderation_appeal_queue` hides those rows
-- so nobody is offered a decision they are not allowed to make. Both are
-- correct: an appeal reviewed by its own author is not an appeal.
--
-- The consequence was invisible. With a single moderator on the roster, every
-- appeal against that moderator's own decision is permanently undecidable —
-- it never appears in a queue, never raises anything, and simply waits. The
-- person waiting is, by construction, someone whose account was suspended or
-- whose work was rejected.
--
-- The integrity rule is not the thing to weaken. What was missing is the
-- alert, so the condition reaches an operator instead of rotting silently.

alter function public.refresh_operational_alerts()
  rename to refresh_operational_alerts_phase7;

create or replace function public.refresh_operational_alerts()
returns integer language plpgsql security definer set search_path = '' as $$
declare created integer := 0; changed integer;
begin
  created := public.refresh_operational_alerts_phase7();

  -- Recovered once a second moderator exists, or the appeal was decided.
  update public.operational_alerts a
  set resolved_at = now()
  where a.resolved_at is null
    and a.code = 'appeal_unreviewable'
    and not exists (
      select 1
      from public.moderation_appeals ap
      where ap.id::text = a.entity_key
        and ap.status = 'pending'
        and not exists (
          select 1 from public.moderators m
          where ap.original_moderator_id is null
             or m.user_id <> ap.original_moderator_id
        )
    );

  insert into public.operational_alerts (code, severity, message, entity_key)
  select
    'appeal_unreviewable',
    'critical',
    'An appeal has no moderator permitted to review it',
    ap.id::text
  from public.moderation_appeals ap
  where ap.status = 'pending'
    and not exists (
      select 1 from public.moderators m
      where ap.original_moderator_id is null
         or m.user_id <> ap.original_moderator_id
    )
  on conflict do nothing;
  get diagnostics changed = row_count; created := created + changed;

  return created;
end;
$$;

revoke execute on function public.refresh_operational_alerts_phase7()
  from public, anon, authenticated;
revoke execute on function public.refresh_operational_alerts()
  from public, anon, authenticated;
grant execute on function public.refresh_operational_alerts_phase7() to service_role;
grant execute on function public.refresh_operational_alerts() to service_role;

-- ---------------------------------------------------------------------------
-- The same condition, answerable before an appeal is ever filed.
-- ---------------------------------------------------------------------------
--
-- An operator should not have to wait for a suspended person to be stuck to
-- learn that appeals cannot be heard. This reports the roster directly.

create or replace function public.appeal_review_capacity()
returns table (
  moderator_count integer,
  pending_appeals integer,
  unreviewable_appeals integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    (select count(*)::integer from public.moderators),
    (select count(*)::integer from public.moderation_appeals
      where status = 'pending'),
    (select count(*)::integer
      from public.moderation_appeals ap
      where ap.status = 'pending'
        and not exists (
          select 1 from public.moderators m
          where ap.original_moderator_id is null
             or m.user_id <> ap.original_moderator_id
        ));
end;
$$;

revoke execute on function public.appeal_review_capacity() from public, anon;
grant execute on function public.appeal_review_capacity() to authenticated;
