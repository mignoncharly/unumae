-- Phase 10 — notifications, and the shape of translation
--
-- The plan is explicit about what this must not become:
--
--   "COME BACK!!! 🔥🔥🔥"
--
-- So there are exactly four categories, the user controls each one, and every
-- send is recorded — partly to avoid duplicates, and partly so the claim that
-- this product does not nag is something anybody can check.

-- ---------------------------------------------------------------------------
-- 1. Which language to write in
-- ---------------------------------------------------------------------------
--
-- A notification is written by a server, so the server has to know which of the
-- three languages this person reads. `languages` on the profile is what they
-- speak; this is what the product should address them in.

alter table public.profiles
  add column locale text not null default 'en';

alter table public.profiles
  add constraint profiles_locale_supported check (locale in ('en', 'fr', 'de'));

grant update (locale) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Where to send
-- ---------------------------------------------------------------------------

create type public.push_platform as enum ('ios', 'android');

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform public.push_platform not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index idx_push_tokens_user on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- 3. What the user agreed to receive
-- ---------------------------------------------------------------------------
--
-- Article 10 of the plan: the user controls every category. Defaults are
-- deliberately conservative — the two that are about *them* are on, and the
-- two that are about the product are off until asked for.

create type public.notification_category as enum (
  -- "Meet today's Human."
  'daily',
  -- "You were selected." The one nobody would want to miss.
  'selected',
  -- "Aya answered your question."
  'answered',
  -- "One year ago today…"
  'anniversary'
);

create table public.notification_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  daily boolean not null default false,
  selected boolean not null default true,
  answered boolean not null default true,
  anniversary boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

comment on table public.notification_settings is
  'One switch per category. Nothing sends without the matching column being true.';

-- ---------------------------------------------------------------------------
-- 4. What was actually sent
-- ---------------------------------------------------------------------------
--
-- The dedupe key is what stops a retried job from sending the same thing twice,
-- and the table is what lets anyone check how often this product contacts a
-- person. Append-only, like the other records that matter.

create table public.notification_log (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category public.notification_category not null,
  -- Usually a cycle date. One notification per category per key, ever.
  dedupe_key text not null,
  sent_at timestamptz not null default now(),
  constraint notification_log_once unique (user_id, category, dedupe_key)
);

create index idx_notification_log_user on public.notification_log (user_id, sent_at desc);

alter table public.notification_log enable row level security;

-- ---------------------------------------------------------------------------
-- 5. Registering a device
-- ---------------------------------------------------------------------------

create or replace function public.register_push_token(
  push_token text,
  device_platform public.push_platform
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.push_tokens (token, user_id, platform)
  values (push_token, (select auth.uid()), device_platform)
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        last_seen_at = now();

  -- First registration creates the settings row, so the defaults above are
  -- what a new person gets rather than "everything on".
  insert into public.notification_settings (user_id)
  values ((select auth.uid()))
  on conflict (user_id) do nothing;

  return true;
end;
$$;

create or replace function public.unregister_push_token(push_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.push_tokens
  where token = push_token
    and user_id = (select auth.uid());

  return true;
end;
$$;

create or replace function public.set_notification_settings(
  daily boolean,
  selected boolean,
  answered boolean,
  anniversary boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_settings as s (
    user_id, daily, selected, answered, anniversary, updated_at
  ) values (
    (select auth.uid()),
    set_notification_settings.daily,
    set_notification_settings.selected,
    set_notification_settings.answered,
    set_notification_settings.anniversary,
    now()
  )
  on conflict (user_id) do update
    set daily = excluded.daily,
        selected = excluded.selected,
        answered = excluded.answered,
        anniversary = excluded.anniversary,
        updated_at = now();

  return true;
end;
$$;

create or replace function public.get_notification_settings()
returns table (
  daily boolean,
  selected boolean,
  answered boolean,
  anniversary boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(s.daily, false),
    coalesce(s.selected, true),
    coalesce(s.answered, true),
    coalesce(s.anniversary, false)
  from (select 1) as always
  left join public.notification_settings s
    on s.user_id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 6. What is due to be sent
-- ---------------------------------------------------------------------------
--
-- Returns recipients and a locale, never a written sentence: the wording lives
-- in the app's translation files, so a notification cannot drift from the
-- language the rest of the product uses.
--
-- Service role only. Nothing about who receives what is client business.

create or replace function public.notifications_due()
returns table (
  user_id uuid,
  token text,
  platform public.push_platform,
  locale text,
  category public.notification_category,
  dedupe_key text,
  subject_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  -- Today's Human is live: tell the people who asked to be told.
  select
    p.id, t.token, t.platform, p.locale, 'daily'::public.notification_category,
    d.selection_date::text,
    pr.display_name
  from public.daily_draws d
  join public.profiles pr on pr.id = d.selected_user_id
  cross join public.profiles p
  join public.push_tokens t on t.user_id = p.id
  join public.notification_settings s on s.user_id = p.id
  where d.selection_status = 'live'
    and s.daily = true
    and p.account_status = 'active'
    -- Never tell somebody about their own day this way; they already know.
    and p.id <> d.selected_user_id
    and not exists (
      select 1 from public.notification_log l
      where l.user_id = p.id
        and l.category = 'daily'
        and l.dedupe_key = d.selection_date::text
    )

  union all

  -- You were selected. Not "you are Today's Human" — nothing is written yet.
  select
    i.user_id, t.token, t.platform, p.locale,
    'selected'::public.notification_category,
    i.id::text,
    null
  from public.draw_invitations i
  join public.profiles p on p.id = i.user_id
  join public.push_tokens t on t.user_id = i.user_id
  join public.notification_settings s on s.user_id = i.user_id
  where i.response is null
    and i.acceptance_deadline > now()
    and s.selected = true
    and not exists (
      select 1 from public.notification_log l
      where l.user_id = i.user_id
        and l.category = 'selected'
        and l.dedupe_key = i.id::text
    )

  union all

  -- Aya answered your question.
  select
    q.author_id, t.token, t.platform, p.locale,
    'answered'::public.notification_category,
    q.id::text,
    pr.display_name
  from public.questions q
  join public.daily_draws d on d.id = q.draw_id
  join public.profiles pr on pr.id = d.selected_user_id
  join public.profiles p on p.id = q.author_id
  join public.push_tokens t on t.user_id = q.author_id
  join public.notification_settings s on s.user_id = q.author_id
  where q.answered_at is not null
    and s.answered = true
    and not exists (
      select 1 from public.notification_log l
      where l.user_id = q.author_id
        and l.category = 'answered'
        and l.dedupe_key = q.id::text
    );
$$;

create or replace function public.record_notification_sent(
  target_user uuid,
  sent_category public.notification_category,
  key text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_log (user_id, category, dedupe_key)
  values (target_user, sent_category, key)
  on conflict (user_id, category, dedupe_key) do nothing;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Translation
-- ---------------------------------------------------------------------------
--
-- Article 9.6 — a translation is added, never substituted. Somebody's own
-- words in their own language are part of who they are, and overwriting them
-- with a machine translation is a form of erasure.
--
-- The schema enforces that by construction: a translation lives in its own
-- table, keyed by locale, and the original is untouched. Nothing in the reader
-- can return a translation *instead of* the original, because the original
-- comes from a different function.

create table public.portrait_element_translations (
  portrait_id uuid not null,
  element_key public.portrait_element_key not null,
  locale text not null,
  translated_text text not null,
  engine text not null,
  translated_at timestamptz not null default now(),

  primary key (portrait_id, element_key, locale),
  foreign key (portrait_id, element_key)
    references public.portrait_elements (portrait_id, element_key)
    on delete cascade,
  constraint portrait_element_translations_locale
    check (locale in ('en', 'fr', 'de'))
);

alter table public.portrait_element_translations enable row level security;

comment on table public.portrait_element_translations is
  'Added alongside the original, never in place of it (Article 9.6).';

create or replace function public.get_portrait_translations(
  target_draw uuid,
  target_locale text
)
returns table (element_key public.portrait_element_key, translated_text text)
language sql
stable
security definer
set search_path = ''
as $$
  select tr.element_key, tr.translated_text
  from public.portrait_element_translations tr
  join public.portraits p on p.id = tr.portrait_id
  join public.daily_draws d on d.id = p.draw_id
  where d.id = target_draw
    and tr.locale = target_locale
    and p.status = 'approved'
    and d.selection_status in ('live', 'completed');
$$;

-- Written by a translation job under the service role. There is deliberately
-- no path for a client to supply a translation of somebody else's words.
create or replace function public.record_translation(
  target_portrait uuid,
  target_element public.portrait_element_key,
  target_locale text,
  text_value text,
  translation_engine text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.portrait_element_translations (
    portrait_id, element_key, locale, translated_text, engine
  ) values (
    target_portrait, target_element, target_locale, text_value, translation_engine
  )
  on conflict (portrait_id, element_key, locale) do update
    set translated_text = excluded.translated_text,
        engine = excluded.engine,
        translated_at = now();

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Privileges
-- ---------------------------------------------------------------------------

revoke all on public.push_tokens from anon, authenticated;
revoke all on public.notification_settings from anon, authenticated;
revoke all on public.notification_log from anon, authenticated;
revoke all on public.portrait_element_translations from anon, authenticated;

-- A person may read what was sent to them. That is the point of keeping it.
grant select on public.notification_log to authenticated;

create policy notification_log_select_own
  on public.notification_log for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke execute on function public.notifications_due() from public, anon, authenticated;
revoke execute on function
  public.record_notification_sent(uuid, public.notification_category, text)
  from public, anon, authenticated;
revoke execute on function
  public.record_translation(uuid, public.portrait_element_key, text, text, text)
  from public, anon, authenticated;

revoke execute on function
  public.register_push_token(text, public.push_platform) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
revoke execute on function
  public.set_notification_settings(boolean, boolean, boolean, boolean)
  from public, anon;
revoke execute on function public.get_notification_settings() from public, anon;
revoke execute on function public.get_portrait_translations(uuid, text) from public;

grant execute on function
  public.register_push_token(text, public.push_platform) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;
grant execute on function
  public.set_notification_settings(boolean, boolean, boolean, boolean)
  to authenticated;
grant execute on function public.get_notification_settings() to authenticated;

-- A guest reads a translated portrait exactly as they read the original one.
grant execute on function public.get_portrait_translations(uuid, text)
  to anon, authenticated;
