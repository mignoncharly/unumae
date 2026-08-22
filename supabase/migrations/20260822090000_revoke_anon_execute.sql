-- SECURITY FIX, part 2 — the grant was not only PUBLIC's.
--
-- The previous migration revoked EXECUTE from PUBLIC and closed the four
-- functions that drive the cycle. Four others stayed open to anonymous
-- callers, which narrowed the cause down: Supabase ships its own default
-- privileges for the `public` schema, along the lines of
--
--   alter default privileges for role postgres in schema public
--     grant all on functions to postgres, anon, authenticated, service_role;
--
-- so every new function is granted to `anon` *directly*, not through PUBLIC.
-- Revoking from PUBLIC therefore had no effect on it, and only the functions
-- that happened to carry an explicit `revoke ... from anon` were protected.
--
-- Two things are needed: take the direct grant back on what exists, and change
-- the default so the next function is closed by default rather than open.

-- ---------------------------------------------------------------------------
-- 1. The functions still open to anon
-- ---------------------------------------------------------------------------

revoke execute on function public.accept_selection() from anon;
revoke execute on function public.decline_selection() from anon;
revoke execute on function public.my_pending_invitation() from anon;
revoke execute on function public.scheduler_installed() from anon;

-- Belt and braces on the ones already closed, so the posture does not depend
-- on which migration happened to say what.
revoke execute on function public.run_daily_draw(date) from anon, authenticated;
revoke execute on function public.escalate_draw(date) from anon, authenticated;
revoke execute on function public.notify_selected_candidate(date)
  from anon, authenticated;
revoke execute on function public.expire_stale_invitations()
  from anon, authenticated;
revoke execute on function public.is_eligible(uuid) from anon;
revoke execute on function public.has_been_selected() from anon;
revoke execute on function public.enforce_min_account_age()
  from anon, authenticated;
revoke execute on function public.touch_updated_at() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Change the default
-- ---------------------------------------------------------------------------
--
-- New functions in `public` are no longer executable by anonymous callers
-- unless a migration says so out loud. `authenticated` keeps the default,
-- because most functions here are for signed-in users and closing that too
-- would produce a wall of boilerplate that people would eventually skip.

alter default privileges in schema public
  revoke execute on functions from anon;

-- ---------------------------------------------------------------------------
-- 3. What stays open, and why
-- ---------------------------------------------------------------------------
--
-- The verification surface (Article 12). Pure functions over values the caller
-- already supplies: they read no table, touch no row, and reveal nothing about
-- anyone. A fairness claim nobody can check is just a claim, so these are
-- re-granted explicitly after the default change above.

grant execute on function public.draw_rank(text, uuid) to anon, authenticated;
grant execute on function public.draw_order(text, uuid[]) to anon, authenticated;
grant execute on function public.pool_hash(uuid[]) to anon, authenticated;
