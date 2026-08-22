-- Phase 4 addendum — make the pool hash publicly recomputable.
--
-- run_daily_draw records candidate_pool_hash, and Article 12 says a fairness
-- claim nobody can check is just a claim. Without this function an outsider
-- holding the pool cannot confirm the hash we published came from it.
--
-- The definition must stay identical to the expression inside run_daily_draw:
-- sha256 of the ids, sorted, comma-joined.

create or replace function public.pool_hash(ids uuid[])
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      (select array_to_string(array_agg(id order by id), ',') from unnest(ids) as id),
      'sha256'
    ),
    'hex'
  );
$$;

comment on function public.pool_hash is
  'Recomputes candidate_pool_hash from a pool, so a published draw can be checked (Article 12).';

grant execute on function public.pool_hash(uuid[]) to anon, authenticated;
