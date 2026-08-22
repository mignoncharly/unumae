-- Phase 8 — the Human Archive, discovery, and One Year Ago
--
-- Article 9.5 fixes what the Archive may be browsed by:
--
--   Today · Yesterday · One year ago · Random Human · Country · Year
--
-- and what it may never be browsed by: most liked, top human, viral, trending.
-- Every function below orders chronologically or randomly. None of them can
-- order by a count, because none of them computes one.
--
-- Article 1.9 makes the Archive permanent, and Article 8.6 lets a person leave
-- it. Those meet here: a removed Human keeps their number and date — so the
-- sequence stays complete — and loses everything else.

-- ---------------------------------------------------------------------------
-- 1. Browsing
-- ---------------------------------------------------------------------------

create or replace function public.get_archive(
  filter_country char(2) default null,
  filter_year integer default null,
  page_limit integer default 30,
  page_offset integer default 0
)
returns table (
  draw_id uuid,
  selection_date date,
  human_number integer,
  display_name text,
  country_code char(2),
  city text,
  photo_path text,
  is_removed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    d.selection_date,
    d.human_number,
    pr.display_name,
    pr.country_code,
    pr.city,
    po.photo_path,
    -- The tombstone (Article 8.6). daily_draws.selected_user_id is
    -- `on delete set null`, so a deleted account leaves the row and loses the
    -- identity.
    (d.selected_user_id is null) as is_removed
  from public.daily_draws d
  left join public.profiles pr on pr.id = d.selected_user_id
  left join public.portraits po
    on po.draw_id = d.id and po.status = 'approved'
  where d.selection_status in ('live', 'completed')
    and d.human_number is not null
    and (filter_country is null or pr.country_code = filter_country)
    and (
      filter_year is null
      or extract(year from d.selection_date)::integer = filter_year
    )
  -- Chronological. There is no other ordering, and nothing here to sort by.
  order by d.selection_date desc
  limit least(greatest(page_limit, 1), 100)
  offset greatest(page_offset, 0);
$$;

comment on function public.get_archive is
  'The Archive, newest first. Never ordered by any count (Article 9.5).';

/*
 * One published cycle in full — the Archive's detail view, and the same shape
 * as get_todays_human so one screen can render either.
 */
create or replace function public.get_human(target_draw uuid)
returns table (
  draw_id uuid,
  selection_date date,
  human_number integer,
  display_name text,
  country_code char(2),
  city text,
  photo_path text,
  published_at timestamptz,
  is_removed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    d.selection_date,
    d.human_number,
    pr.display_name,
    pr.country_code,
    pr.city,
    po.photo_path,
    d.published_at,
    (d.selected_user_id is null) as is_removed
  from public.daily_draws d
  left join public.profiles pr on pr.id = d.selected_user_id
  left join public.portraits po
    on po.draw_id = d.id and po.status = 'approved'
  where d.id = target_draw
    and d.selection_status in ('live', 'completed')
    and d.human_number is not null;
$$;

-- ---------------------------------------------------------------------------
-- 2. Random Human
-- ---------------------------------------------------------------------------
--
-- Sampled by a random offset rather than `order by random()`. Two reasons: it
-- does not sort the whole table, and `order by random()` is banned outright in
-- this codebase so that it can never quietly reappear in the daily draw, where
-- it would destroy auditability (Article 5.2).

create or replace function public.get_random_human(
  filter_country char(2) default null
)
returns table (
  draw_id uuid,
  selection_date date,
  human_number integer,
  display_name text,
  country_code char(2),
  city text,
  photo_path text,
  is_removed boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  total integer;
  pick integer;
begin
  select count(*) into total
  from public.daily_draws d
  left join public.profiles pr on pr.id = d.selected_user_id
  where d.selection_status in ('live', 'completed')
    and d.human_number is not null
    and (filter_country is null or pr.country_code = filter_country);

  if total = 0 then
    return;
  end if;

  pick := floor(random() * total)::integer;

  return query
  select *
  from public.get_archive(filter_country, null, 1, pick);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. One Year Ago
-- ---------------------------------------------------------------------------
--
-- The feature that makes the product gain value simply by existing. Returns
-- every anniversary that actually has a Human, so the same query serves
-- "one year ago" now and "ten years ago" later without a change.

create or replace function public.get_anniversaries()
returns table (
  years_ago integer,
  draw_id uuid,
  selection_date date,
  human_number integer,
  display_name text,
  country_code char(2),
  photo_path text,
  is_removed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    y.years_ago,
    d.id,
    d.selection_date,
    d.human_number,
    pr.display_name,
    pr.country_code,
    po.photo_path,
    (d.selected_user_id is null) as is_removed
  from (values (1), (5), (10), (25)) as y (years_ago)
  join public.daily_draws d
    on d.selection_date
       = ((now() at time zone 'utc')::date - (y.years_ago || ' years')::interval)::date
  left join public.profiles pr on pr.id = d.selected_user_id
  left join public.portraits po
    on po.draw_id = d.id and po.status = 'approved'
  where d.selection_status in ('live', 'completed')
    and d.human_number is not null
  order by y.years_ago asc;
$$;

comment on function public.get_anniversaries is
  'One year ago today, and five, ten, twenty-five. Empty until the Archive is old enough.';

-- ---------------------------------------------------------------------------
-- 4. What can be filtered by
-- ---------------------------------------------------------------------------
--
-- Countries and years, with counts — used to build the filter lists and to
-- publish the figures Article 12 allows ("43 countries").
--
-- Ordered alphabetically and chronologically, deliberately NOT by count. A
-- country list sorted by how many Humans it has is a leaderboard of countries,
-- and this product does not rank anything.

create or replace function public.get_archive_countries()
returns table (country_code char(2), humans integer)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.country_code, count(*)::integer
  from public.daily_draws d
  join public.profiles pr on pr.id = d.selected_user_id
  where d.selection_status in ('live', 'completed')
    and d.human_number is not null
  group by pr.country_code
  order by pr.country_code asc;
$$;

create or replace function public.get_archive_years()
returns table (year integer, humans integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    extract(year from d.selection_date)::integer as year,
    count(*)::integer
  from public.daily_draws d
  where d.selection_status in ('live', 'completed')
    and d.human_number is not null
  group by 1
  order by 1 desc;
$$;

-- ---------------------------------------------------------------------------
-- 5. Privileges
-- ---------------------------------------------------------------------------
--
-- The Archive is readable by guests, in full (Article 6.1). Everything here is
-- a read of already-published material.

revoke execute on function
  public.get_archive(char(2), integer, integer, integer) from public;
revoke execute on function public.get_human(uuid) from public;
revoke execute on function public.get_random_human(char(2)) from public;
revoke execute on function public.get_anniversaries() from public;
revoke execute on function public.get_archive_countries() from public;
revoke execute on function public.get_archive_years() from public;

grant execute on function
  public.get_archive(char(2), integer, integer, integer) to anon, authenticated;
grant execute on function public.get_human(uuid) to anon, authenticated;
grant execute on function public.get_random_human(char(2)) to anon, authenticated;
grant execute on function public.get_anniversaries() to anon, authenticated;
grant execute on function public.get_archive_countries() to anon, authenticated;
grant execute on function public.get_archive_years() to anon, authenticated;
