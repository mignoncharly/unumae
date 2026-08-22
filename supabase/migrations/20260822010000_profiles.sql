-- Phase 3 — user profiles
--
-- Deliberately minimal (Product Constitution Article 6.2 and 7.2). What is
-- absent matters as much as what is present: there is no audience count, no
-- score, no ranking column, and there never will be.
--
-- Column-level GRANTs are what stop a user promoting themselves: row level
-- security decides which rows you touch, GRANTs decide which columns. Both are
-- required here.

create type public.account_status as enum (
  'active',
  'suspended',
  'banned',
  'deleted'
);

-- Progressive proof of humanity (Article 8.5): friction rises with stakes.
create type public.verification_level as enum (
  'none',
  'email',
  'device',
  'phone',
  'liveness'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  username extensions.citext not null unique,
  display_name text not null,

  -- Age gate only. Not a birthday feature: we never ask for the day (Article 8.2).
  birth_year integer not null,

  -- Country is sufficient and is the only required location (Article 8.2).
  country_code char(2) not null,
  -- Optional, hideable, never required.
  city text,

  languages text[] not null default '{}',
  avatar_path text,
  bio_short text,

  -- Eligibility inputs. Never writable by the user — see the GRANTs below.
  selection_eligible boolean not null default false,
  verification_level public.verification_level not null default 'none',
  account_status public.account_status not null default 'active',
  accepted_rules_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_display_name_length
    check (char_length(display_name) between 1 and 40),
  constraint profiles_bio_short_length
    check (bio_short is null or char_length(bio_short) <= 160),
  constraint profiles_city_length
    check (city is null or char_length(city) between 1 and 80),
  constraint profiles_country_code_format
    check (country_code ~ '^[A-Z]{2}$'),
  constraint profiles_birth_year_sane
    check (birth_year between 1900 and 2200),
  constraint profiles_languages_bounded
    check (array_length(languages, 1) is null or array_length(languages, 1) <= 10)
);

comment on table public.profiles is
  'Minimal user profile. Ranking and audience columns are forbidden (Article 7.2).';
comment on column public.profiles.birth_year is
  'Age gate only (Article 8.4). Immutable after creation: see column GRANTs.';
comment on column public.profiles.selection_eligible is
  'Set by the eligibility engine, never by the user.';

-- The minimum age is 16 and it is a hard gate, not a warning (Article 8.4).
-- This cannot be a CHECK constraint: the current year is not an immutable
-- expression, so Postgres rejects it there.
create or replace function public.enforce_min_account_age()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.birth_year > (extract(year from now())::integer - 16) then
    raise exception
      'Minimum age is 16 (Product Constitution, Article 8.4)'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_enforce_min_age
  before insert or update of birth_year on public.profiles
  for each row execute function public.enforce_min_account_age();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create index idx_profiles_country_code on public.profiles (country_code);
-- The Phase 4 candidate pool is built from exactly this predicate.
create index idx_profiles_selection_pool
  on public.profiles (selection_eligible, account_status)
  where selection_eligible = true and account_status = 'active';

alter table public.profiles enable row level security;

-- A profile is private to its owner at this phase. Nothing in the app displays
-- another user's profile yet; when Today's Human is published (Phase 7) it is
-- exposed through its own published record, not by opening this table up.
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No delete policy: account deletion cascades from auth.users, so a profile is
-- never orphaned and a user cannot delete the row while keeping the account.

revoke all on public.profiles from anon, authenticated;

grant select on public.profiles to authenticated;

-- birth_year is insertable but not updatable: an age gate you can edit after
-- the fact is not a gate.
grant insert (
  id,
  username,
  display_name,
  birth_year,
  country_code,
  city,
  languages,
  avatar_path,
  bio_short
) on public.profiles to authenticated;

grant update (
  username,
  display_name,
  country_code,
  city,
  languages,
  avatar_path,
  bio_short
) on public.profiles to authenticated;

-- selection_eligible, verification_level, account_status and accepted_rules_at
-- are absent from both GRANTs on purpose. They are written by the service role
-- only. A user cannot make themselves eligible, verified, or unbanned.
