-- Phase 6 — verification policy and rules acceptance
--
-- Implements docs/VERIFICATION_POLICY.md. Two gates existed in the schema but
-- nothing ever set them: `selection_eligible` was false for everyone, and
-- `accepted_rules_at` had no way to be filled, so the pool was permanently
-- empty and every cycle would have been a Quiet Day.

-- ---------------------------------------------------------------------------
-- 1. Accepting the community rules
-- ---------------------------------------------------------------------------
--
-- `accepted_rules_at` is not in any client GRANT, so acceptance goes through a
-- function. It records only that acceptance happened and when — there is no
-- way for a client to claim a date it did not earn.

create or replace function public.accept_community_rules()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted timestamptz;
begin
  update public.profiles
  set accepted_rules_at = now()
  where id = (select auth.uid())
  returning accepted_rules_at into accepted;

  return accepted;
end;
$$;

comment on function public.accept_community_rules is
  'Records that the caller accepted the community rules. Required for eligibility (Article 5.1).';

-- ---------------------------------------------------------------------------
-- 2. Initial verification level
-- ---------------------------------------------------------------------------
--
-- Signing in with Apple, or confirming an emailed code, means the address has
-- already been verified by the provider. That is level 'email' — enough to
-- enter the pool after seven days, and nowhere near enough to be published.

create or replace function public.set_initial_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmed boolean;
begin
  select
    u.email_confirmed_at is not null
    or coalesce(u.raw_app_meta_data ->> 'provider', '') = 'apple'
  into confirmed
  from auth.users u
  where u.id = new.id;

  if coalesce(confirmed, false) then
    new.verification_level := 'email';
  end if;

  return new;
end;
$$;

create trigger profiles_set_initial_verification
  before insert on public.profiles
  for each row execute function public.set_initial_verification();

-- ---------------------------------------------------------------------------
-- 3. Maintaining selection_eligible
-- ---------------------------------------------------------------------------
--
-- The bar to enter the pool, from docs/VERIFICATION_POLICY.md:
--
--   active account
--   verification_level <> 'none'
--   account at least 7 days old
--
-- Seven days matters because the pool freezes two days before a cycle: an
-- account registered for tomorrow's draw is not in the frozen pool at all, so
-- mass entry becomes a sustained operation rather than a same-day one.
--
-- This is the system's judgement and is never writable by a user. Whether they
-- *want* to be in the pool is a separate column they do control.

create or replace function public.refresh_selection_eligibility()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  with judged as (
    select
      p.id,
      (
        p.account_status = 'active'
        and p.verification_level <> 'none'
        and p.created_at <= now() - interval '7 days'
      ) as should_be_eligible
    from public.profiles p
  )
  update public.profiles p
  set selection_eligible = j.should_be_eligible
  from judged j
  where p.id = j.id
    and p.selection_eligible is distinct from j.should_be_eligible;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

comment on function public.refresh_selection_eligibility is
  'Applies docs/VERIFICATION_POLICY.md. Runs nightly, before the draw.';

-- ---------------------------------------------------------------------------
-- 4. Schedule it before the draw
-- ---------------------------------------------------------------------------
--
-- 23:50 UTC, ten minutes ahead of the 00:00 pool freeze. Running it after the
-- freeze would mean a user became eligible for a pool that had already closed.

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname)
    from cron.job
    where jobname = 'onehuman-refresh-eligibility';

    perform cron.schedule(
      'onehuman-refresh-eligibility',
      '50 23 * * *',
      'select public.refresh_selection_eligibility()'
    );
  end if;
exception
  when others then
    raise notice 'Could not schedule eligibility refresh: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Privileges
-- ---------------------------------------------------------------------------

revoke execute on function public.accept_community_rules() from public, anon;
revoke execute on function public.refresh_selection_eligibility()
  from public, anon, authenticated;
revoke execute on function public.set_initial_verification()
  from public, anon, authenticated;

grant execute on function public.accept_community_rules() to authenticated;
