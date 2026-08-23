-- BUG FIX — country_balance() raised on every call.
--
--   column reference "country_code" is ambiguous
--   It could refer to either a PL/pgSQL variable or a table column.
--
-- In a plpgsql function, the OUT parameters of `returns table (...)` are in
-- scope as variables for the whole body. `country_code` was both an OUT
-- parameter and a column being grouped, so every unqualified reference was
-- ambiguous and Postgres refused to plan the query.
--
-- Found by scripts/simulate-cycle.mjs, which is the only thing that can find
-- it: the function refuses anyone who is not a moderator, so the service role
-- cannot execute it and no offline test can either. The guard that makes it
-- safe is the same guard that makes it hard to check.
--
-- Fixed by aliasing every table so no reference is bare. Renaming the OUT
-- parameters would also have worked and would have been worse — the column
-- names are the API this returns, and they are correct.

create or replace function public.country_balance()
returns table (
  country_code char(2),
  waiting integer,
  pool_share numeric,
  published integer,
  archive_share numeric,
  drift numeric
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
  with pool as (
    select p.country_code as code
    from public.profiles p
    where public.is_eligible(p.id)
  ),
  pool_total as (select count(*)::numeric as n from pool),
  archive as (
    select pr.country_code as code
    from public.daily_draws d
    join public.profiles pr on pr.id = d.selected_user_id
    where d.human_number is not null
  ),
  archive_total as (select count(*)::numeric as n from archive),
  pool_by_country as (
    select pl.code, count(*)::integer as n from pool pl group by pl.code
  ),
  archive_by_country as (
    select ar.code, count(*)::integer as n from archive ar group by ar.code
  ),
  by_country as (
    select
      coalesce(a.code, b.code) as code,
      coalesce(a.n, 0) as waiting_n,
      coalesce(b.n, 0) as published_n
    from pool_by_country a
    full outer join archive_by_country b on a.code = b.code
  )
  select
    c.code,
    c.waiting_n,
    case when (select t.n from pool_total t) = 0 then 0
         else round(c.waiting_n * 100 / (select t.n from pool_total t), 1) end,
    c.published_n,
    case when (select t.n from archive_total t) = 0 then 0
         else round(c.published_n * 100 / (select t.n from archive_total t), 1)
    end,
    -- Archive share minus pool share. Negative means under-represented so far.
    -- With a small Archive this is mostly noise, and reading it as a problem
    -- before there are a few hundred cycles would be reading tea leaves.
    case
      when (select t.n from pool_total t) = 0
        or (select t.n from archive_total t) = 0
        then 0
      else round(
        c.published_n * 100 / (select t.n from archive_total t)
        - c.waiting_n * 100 / (select t.n from pool_total t), 1)
    end
  from by_country c
  order by c.waiting_n desc, c.code;
end;
$$;

revoke execute on function public.country_balance() from public, anon;
grant execute on function public.country_balance() to authenticated;
