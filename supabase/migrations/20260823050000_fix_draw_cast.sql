-- BUG FIX — run_daily_draw() has never worked.
--
--   column "selection_status" is of type public.selection_status
--   but expression is of type text
--
-- The status was chosen with a CASE:
--
--   case when ordered[1] is null then 'cancelled' else 'selected' end
--
-- which yields `text`. Postgres will not implicitly cast text to an enum in an
-- INSERT, so the whole function raised — every time, since Phase 4.
--
-- Nothing caught it. The schema guards read the migration as text and checked
-- what it says; they cannot check that it runs. The scheduled job at 00:00 UTC
-- would have failed silently every night, and the first sign would have been an
-- empty product on launch day.
--
-- Found by scripts/simulate-cycle.mjs on its first run, which is the entire
-- reason that script exists: a cycle takes three real days, so without it
-- nobody executes this path until it matters.

create or replace function public.run_daily_draw(target_date date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_draw_id uuid;
  pool uuid[];
  pool_hash text;
  seed text;
  ordered uuid[];
  next_version integer;
begin
  if exists (
    select 1 from public.daily_draws
    where selection_date = target_date
      and selection_status <> 'cancelled'
  ) then
    raise exception 'A draw already exists for %', target_date
      using errcode = 'unique_violation';
  end if;

  -- Freeze. Ordering by id makes the hash depend on membership only, never on
  -- the order rows happened to come back in.
  select coalesce(array_agg(p.id order by p.id), '{}'::uuid[])
  into pool
  from public.profiles p
  where public.is_eligible(p.id);

  pool_hash := encode(
    extensions.digest(array_to_string(pool, ','), 'sha256'),
    'hex'
  );

  -- Cryptographically secure, not random(). 32 bytes.
  seed := encode(extensions.gen_random_bytes(32), 'hex');

  ordered := public.draw_order(seed, pool);

  select coalesce(max(draw_version), 0) + 1
  into next_version
  from public.daily_draws
  where selection_date = target_date;

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
    pool_hash,
    coalesce(array_length(pool, 1), 0),
    seed,
    ordered[1],
    ordered[2],
    ordered[3],
    ordered[4],
    -- An empty pool is a Quiet Day waiting to happen, recorded honestly rather
    -- than hidden (Article 5.8). Cast explicitly: this is the line that broke.
    (case when ordered[1] is null then 'cancelled' else 'selected' end)
      ::public.selection_status
  )
  returning id into new_draw_id;

  insert into public.draw_candidates (draw_id, user_id)
  select new_draw_id, unnest(pool);

  return new_draw_id;
end;
$$;

revoke execute on function public.run_daily_draw(date)
  from public, anon, authenticated;
