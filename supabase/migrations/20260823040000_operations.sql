-- Operational helpers, for running and unwinding a simulated cycle.
--
-- The plan asks for the loop to be exercised quickly before the internal alpha
-- — a real cycle takes three days, so nobody would ever run it end to end by
-- waiting. These two exist for scripts/simulate-cycle.mjs.
--
-- Both are service role only. Neither is reachable from the app, and neither
-- should ever be called against real data.

/*
 * Give an older cycle its number.
 *
 * publish_due_cycles assigns numbers only to *today's* cycle, which is correct:
 * a number is a publication, and a publication happens on its day. A simulated
 * cycle for yesterday still needs one so the Archive has something to show.
 */
create or replace function public.assign_human_number(target_draw uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned integer;
begin
  update public.daily_draws
  set human_number = coalesce(human_number, nextval('public.human_number_seq'))
  where id = target_draw
  returning human_number into assigned;

  return assigned;
end;
$$;

/*
 * Put the sequence back after simulated cycles are deleted.
 *
 * Without this, the first real Human would be #14 because a dozen people who
 * never existed took the numbers before them. The Archive's sequence is
 * supposed to mean something.
 *
 * It can only ever move the sequence to one past the highest number still in
 * the table, so it cannot collide with a real published cycle.
 */
create or replace function public.rewind_human_numbers()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  highest integer;
begin
  select coalesce(max(human_number), 0) into highest from public.daily_draws;

  perform setval('public.human_number_seq', greatest(highest, 1), highest > 0);

  return highest;
end;
$$;

revoke execute on function public.assign_human_number(uuid)
  from public, anon, authenticated;
revoke execute on function public.rewind_human_numbers()
  from public, anon, authenticated;
