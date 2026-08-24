/*
 * Phase 5: make beta publication assurance match the product we can operate.
 *
 * The old liveness switch was deliberately disabled because no capture or
 * deletion flow existed. Publication remains gated by acceptance, a completed
 * portrait, and human moderation. The legacy enum value stays so existing rows
 * remain readable, but no liveness RPC or runtime switch remains.
 */

delete from public.app_settings
where key = 'require_liveness_before_publication';

drop function if exists public.record_liveness_check(uuid);

create or replace function public.publish_due_cycles()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'utc')::date;
  published integer := 0;
begin
  update public.daily_draws
  set selection_status = 'completed'
  where selection_status = 'live'
    and selection_date < today;

  with due as (
    select d.id
    from public.daily_draws d
    join public.portraits p on p.draw_id = d.id
    where d.selection_date = today
      and d.selection_status = 'ready'
      and p.status = 'approved'
  )
  update public.daily_draws d
  set selection_status = 'live',
      published_at = now(),
      human_number = nextval('public.human_number_seq')
  from due
  where d.id = due.id;

  get diagnostics published = row_count;
  return published;
end;
$$;

comment on function public.publish_due_cycles() is
  'Publishes only an accepted, completed portrait approved by a human moderator. Liveness is not a beta requirement.';

revoke execute on function public.publish_due_cycles()
  from public, anon, authenticated;
