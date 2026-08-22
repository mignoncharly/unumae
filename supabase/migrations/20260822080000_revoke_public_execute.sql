-- SECURITY FIX — privileged functions were executable by anonymous callers.
--
-- Postgres grants EXECUTE on every new function to PUBLIC by default, and
-- `revoke execute ... from anon, authenticated` does not remove that default
-- grant. Both anon and authenticated inherit PUBLIC, so the revokes in the
-- Phase 4 and Phase 5 migrations achieved nothing.
--
-- The consequence was not theoretical. Probing the live project with the
-- publishable key — which ships inside the app — showed:
--
--   escalate_draw              executed, reaching its own "No draw" exception
--   notify_selected_candidate  executed, returned null
--   expire_stale_invitations   executed, returned 0
--   run_daily_draw             failed on argument type, not on permission
--
-- Anyone with the app bundle could therefore have skipped the selected
-- candidate, or driven the cycle. That is a direct attack on Article 5, and
-- the fairness the whole product rests on.
--
-- The rule from here: revoke from PUBLIC first, then grant deliberately.

-- ---------------------------------------------------------------------------
-- 1. Take back the default grant on everything privileged
-- ---------------------------------------------------------------------------

revoke execute on function public.run_daily_draw(date) from public;
revoke execute on function public.escalate_draw(date) from public;
revoke execute on function public.notify_selected_candidate(date) from public;
revoke execute on function public.expire_stale_invitations() from public;
revoke execute on function public.is_eligible(uuid) from public;
revoke execute on function public.has_been_selected() from public;
revoke execute on function public.accept_selection() from public;
revoke execute on function public.decline_selection() from public;
revoke execute on function public.my_pending_invitation() from public;
revoke execute on function public.scheduler_installed() from public;
revoke execute on function public.enforce_min_account_age() from public;
revoke execute on function public.touch_updated_at() from public;

-- ---------------------------------------------------------------------------
-- 2. Grant back, deliberately and narrowly
-- ---------------------------------------------------------------------------
--
-- Service role only, and therefore named nowhere below: run_daily_draw,
-- escalate_draw, notify_selected_candidate, expire_stale_invitations. The
-- cycle is driven by the scheduler, never by a client.

grant execute on function public.is_eligible(uuid) to authenticated;
grant execute on function public.has_been_selected() to authenticated;
grant execute on function public.accept_selection() to authenticated;
grant execute on function public.decline_selection() to authenticated;
grant execute on function public.my_pending_invitation() to authenticated;
grant execute on function public.scheduler_installed() to authenticated;

-- The verification surface stays open to everyone on purpose (Article 12).
-- These are pure functions over values the caller already holds; they read no
-- table and reveal nothing about anyone.
revoke execute on function public.draw_rank(text, uuid) from public;
revoke execute on function public.draw_order(text, uuid[]) from public;
revoke execute on function public.pool_hash(uuid[]) from public;

grant execute on function public.draw_rank(text, uuid) to anon, authenticated;
grant execute on function public.draw_order(text, uuid[]) to anon, authenticated;
grant execute on function public.pool_hash(uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Stop this happening again
-- ---------------------------------------------------------------------------
--
-- Future functions created in `public` no longer carry the PUBLIC execute
-- grant, so a new privileged function is closed until someone opens it —
-- rather than open until someone remembers to close it.

alter default privileges in schema public
  revoke execute on functions from public;
