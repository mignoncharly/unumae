-- Fix: pool_hash returned NULL for an empty pool, run_daily_draw returned
-- sha256('').
--
-- `array_agg` over zero rows is NULL, and `digest(NULL)` is NULL, so the public
-- verification function disagreed with the recorded hash in exactly one case —
-- an empty candidate pool, which is the Quiet Day case (Article 5.8). The one
-- day the product visibly fails is the day people would most want to check the
-- record, so this is worth getting right.
--
-- run_daily_draw was already correct: it coalesces the pool to '{}' first, and
-- `array_to_string('{}', ',')` is the empty string rather than NULL. Only the
-- verification function needed to agree with it.
--
-- Caught by scripts/verify-draw.mjs, which is the entire reason two
-- independent implementations exist.

create or replace function public.pool_hash(ids uuid[])
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      coalesce(
        (
          select array_to_string(array_agg(id order by id), ',')
          from unnest(ids) as id
        ),
        ''
      ),
      'sha256'
    ),
    'hex'
  );
$$;
