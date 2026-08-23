-- SECURITY / CORRECTNESS FIX — nobody could read a portrait photograph.
--
-- The Phase 7 policy decided whether an object was published by joining
-- storage.objects to portraits and daily_draws:
--
--   using (bucket_id = 'portraits' and exists (
--     select 1 from public.portraits p
--     join public.daily_draws d on d.id = p.draw_id ...))
--
-- But `anon` and `authenticated` hold only column-level SELECT on
-- `daily_draws`, and `id` — the column the join needs — is deliberately not
-- among them. Evaluating the policy therefore raised
--
--   permission denied for table daily_draws
--
-- and because Postgres evaluates every permissive SELECT policy on a table,
-- that error aborted *all* reads of the portraits bucket. Not just published
-- ones: an author could not read back the photograph they had just uploaded,
-- and no signed URL could be created for today's Human. The app's main screen
-- would have shown no photograph at all.
--
-- Found by a control assertion in scripts/verify-security.mjs — the check that
-- the *permitted* case still works, added precisely so that a refusal could not
-- be mistaken for a policy doing its job.
--
-- The fix moves the decision into a security definer function, which runs with
-- the owner's privileges and so is not bound by the caller's column grants.
-- The alternative — granting `daily_draws.id` to every client — would widen
-- the table's exposure to fix a policy, which is the wrong direction.

create or replace function public.is_published_portrait_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portraits p
    join public.daily_draws d on d.id = p.draw_id
    where p.photo_path = object_name
      and p.status = 'approved'
      and d.selection_status in ('live', 'completed')
  );
$$;

comment on function public.is_published_portrait_object is
  'Whether a storage object belongs to a portrait whose cycle has gone live. Used by the storage policy so it needs no column grants on daily_draws.';

revoke execute on function public.is_published_portrait_object(text)
  from public, anon, authenticated;

-- The policy runs as the table owner, which is what evaluates this — the
-- function does not need to be callable by the client itself.

drop policy if exists storage_portraits_published_read on storage.objects;

create policy storage_portraits_published_read
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'portraits'
    and public.is_published_portrait_object(name)
  );
