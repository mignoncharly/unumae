-- Bootstrapping the first moderator
--
-- `public.moderators` is service-role only by design: no client can grant
-- moderation authority, including to itself. That is correct, and it creates a
-- chicken-and-egg problem — until one row exists, no portrait can be approved,
-- so no cycle can ever go live.
--
-- Solving it by hand would mean somebody signing up, then finding their uuid,
-- then running an insert from a SQL editor, and remembering to do it again on
-- any fresh environment. Instead the intent is recorded by email, and acted on
-- automatically the moment that person finishes their profile.

create table public.founding_moderators (
  email extensions.citext primary key,
  note text,
  added_at timestamptz not null default now()
);

alter table public.founding_moderators enable row level security;
revoke all on public.founding_moderators from anon, authenticated;

comment on table public.founding_moderators is
  'Emails promoted to moderator automatically on profile creation. Service role only.';

-- The project owner. Remove a row here and the promotion simply stops
-- happening; it does not demote anybody who is already a moderator.
insert into public.founding_moderators (email, note) values
  ('charles.nguenkam@gmail.com', 'Project owner'),
  ('mignoncharly@yahoo.fr', 'Project owner, second address')
on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- Promote on profile creation
-- ---------------------------------------------------------------------------
--
-- After insert rather than before: `moderators` references `profiles`, so the
-- profile row has to exist first.

create or replace function public.promote_founding_moderator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_email text;
begin
  select u.email into account_email
  from auth.users u
  where u.id = new.id;

  if account_email is null then
    return new;
  end if;

  if exists (
    select 1 from public.founding_moderators f
    where f.email = account_email
  ) then
    insert into public.moderators (user_id, note)
    values (new.id, 'Founding moderator, promoted automatically')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger profiles_promote_founding_moderator
  after insert on public.profiles
  for each row execute function public.promote_founding_moderator();

-- Anyone who already has a profile is promoted now, so this works whether the
-- owner signs up before or after this migration.
insert into public.moderators (user_id, note)
select p.id, 'Founding moderator, promoted on migration'
from public.profiles p
join auth.users u on u.id = p.id
join public.founding_moderators f on f.email = u.email
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Adding and removing moderators later
-- ---------------------------------------------------------------------------
--
-- By email, because nobody knows their own uuid. Service role only: promoting
-- a moderator is not something a moderator may do, or the role would spread
-- without anyone deciding to spread it.

create or replace function public.grant_moderator(target_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  select p.id into target_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = target_email;

  if target_id is null then
    return false;
  end if;

  insert into public.moderators (user_id, note)
  values (target_id, 'Granted by ' || coalesce((select auth.uid())::text, 'service role'))
  on conflict (user_id) do nothing;

  insert into public.moderation_events (actor_id, action, subject_id, reason)
  values ((select auth.uid()), 'account_reinstated', target_id, 'Granted moderator');

  return true;
end;
$$;

create or replace function public.revoke_moderator(target_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  select p.id into target_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = target_email;

  if target_id is null then
    return false;
  end if;

  delete from public.moderators where user_id = target_id;

  insert into public.moderation_events (actor_id, action, subject_id, reason)
  values ((select auth.uid()), 'account_reinstated', target_id, 'Revoked moderator');

  return true;
end;
$$;

revoke execute on function public.promote_founding_moderator()
  from public, anon, authenticated;
revoke execute on function public.grant_moderator(text)
  from public, anon, authenticated;
revoke execute on function public.revoke_moderator(text)
  from public, anon, authenticated;
