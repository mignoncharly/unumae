-- Phase 15 — selection transparency and country representation.
--
-- The plan asks for exactly this, in exactly this shape:
--
--     1,042 Humans waiting
--     43 countries
--     137 languages
--
-- Three numbers, published to everyone including guests. They are the honest
-- version of the thing every other social product states as a vanity metric:
-- not "1,042 users", which measures us, but "1,042 people waiting for the same
-- thing you are waiting for", which measures your odds.
--
-- This is the number that makes the product legible. At a thousand people, one
-- in a thousand is a real chance and saying so is the strongest true thing we
-- can say. It gets worse as we grow, and it will still be published then —
-- Article 12 does not have an exception for numbers that stop flattering us.

-- ---------------------------------------------------------------------------
-- 1. The pool, counted the way the draw counts it
-- ---------------------------------------------------------------------------
--
-- Deliberately `is_eligible(p.id)` rather than a hand-written copy of its
-- predicate. A transparency figure that drifts from the function that actually
-- freezes the pool would be worse than publishing nothing: it would be a
-- confident wrong number. Postgres inlines the scalar SQL function, so this
-- stays one pass over profiles.

create or replace function public.selection_stats()
returns table (
  waiting integer,
  countries integer,
  languages integer,
  humans_published integer,
  archive_countries integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with pool as (
    select p.country_code, p.languages
    from public.profiles p
    where public.is_eligible(p.id)
  )
  select
    (select count(*)::integer from pool),
    (select count(distinct country_code)::integer from pool),
    (
      select count(distinct language)::integer
      from pool, unnest(pool.languages) as language
    ),
    (
      select count(*)::integer
      from public.daily_draws d
      where d.human_number is not null
    ),
    (
      select count(distinct pr.country_code)::integer
      from public.daily_draws d
      join public.profiles pr on pr.id = d.selected_user_id
      where d.human_number is not null
    );
$$;

comment on function public.selection_stats is
  'Article 12 — the pool, its countries and its languages. Public, including guests.';

-- ---------------------------------------------------------------------------
-- 2. Country representation
-- ---------------------------------------------------------------------------
--
-- Which countries are waiting, and how many from each.
--
-- With a floor. A country with two people in the pool is a country where being
-- drawn identifies you, and the Archive would confirm it the same day. Below
-- the floor the countries are still counted — they appear in `other_countries`,
-- so the total always adds up and nobody is erased — but they are not named
-- alongside a number small enough to point at somebody.
--
-- The floor is a schema-level fact, not a client-side filter: the function
-- never returns the rows, so there is nothing for a caller to ask for.

create or replace function public.country_representation()
returns table (
  country_code char(2),
  waiting integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.country_code, count(*)::integer
  from public.profiles p
  where public.is_eligible(p.id)
  group by p.country_code
  having count(*) >= 5
  order by count(*) desc, p.country_code asc;
$$;

comment on function public.country_representation is
  'Countries with at least five people waiting. Smaller ones are counted, never named.';

/*
 * How many are waiting in countries too small to name.
 *
 * Published alongside the list so the arithmetic is checkable: the named
 * countries plus this equals `waiting`. A transparency page whose numbers do
 * not add up teaches people to distrust the ones that do.
 */
create or replace function public.unnamed_countries()
returns table (
  countries integer,
  waiting integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with small as (
    select p.country_code, count(*)::integer as n
    from public.profiles p
    where public.is_eligible(p.id)
    group by p.country_code
    having count(*) < 5
  )
  select
    coalesce(count(*)::integer, 0),
    coalesce(sum(n)::integer, 0)
  from small;
$$;

-- ---------------------------------------------------------------------------
-- 3. Privileges
-- ---------------------------------------------------------------------------
--
-- All three are public. Article 12 makes the fairness of the draw checkable by
-- anybody, and the size of the pool is the first thing you need in order to
-- check it — a guest who cannot see how many people are waiting cannot tell
-- whether one in a thousand is true.

revoke execute on function public.selection_stats() from public;
revoke execute on function public.country_representation() from public;
revoke execute on function public.unnamed_countries() from public;

grant execute on function public.selection_stats() to anon, authenticated;
grant execute on function public.country_representation() to anon, authenticated;
grant execute on function public.unnamed_countries() to anon, authenticated;
