-- Phase 3 -- memory that scales, and translations people can actually read.

-- Joining the draw must be a decision, never a side effect of creating an
-- account. Existing choices are preserved; only new rows get the safe default.
alter table public.profiles alter column wants_selection set default false;
grant insert (wants_selection, locale) on public.profiles to authenticated;

-- Cursor paths stay indexed after the Archive and a private library contain
-- hundreds or thousands of Humans.
create index if not exists daily_draws_archive_cursor
  on public.daily_draws (selection_date desc, id desc)
  where selection_status in ('live', 'completed') and human_number is not null;
create index if not exists remembers_owner_cursor
  on public.remembers (user_id, created_at desc, draw_id desc);
create index if not exists portrait_translations_reader
  on public.portrait_element_translations (portrait_id, locale, element_key);

-- ---------------------------------------------------------------------------
-- Cursor Archive, Yesterday, and the private Remembered library
-- ---------------------------------------------------------------------------

create or replace function public.get_archive_page(
  filter_country char(2) default null,
  filter_year integer default null,
  page_limit integer default 24,
  before_date date default null,
  before_draw uuid default null
)
returns table (
  draw_id uuid,
  selection_date date,
  human_number integer,
  display_name text,
  country_code char(2),
  city text,
  photo_path text,
  is_removed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    d.selection_date,
    d.human_number,
    case when d.redacted_at is null then p.display_name end,
    case when d.redacted_at is null then p.country_code end,
    case when d.redacted_at is null and not p.city_hidden then p.city end,
    case when d.redacted_at is null then po.photo_path end,
    (d.redacted_at is not null or d.selected_user_id is null)
  from public.daily_draws d
  left join public.profiles p on p.id = d.selected_user_id
  left join public.portraits po on po.draw_id = d.id and po.status = 'approved'
  where d.selection_status in ('live', 'completed')
    and d.human_number is not null
    and (filter_country is null or (
      d.redacted_at is null and p.country_code = filter_country
    ))
    and (filter_year is null or extract(year from d.selection_date)::integer = filter_year)
    and (
      before_date is null
      or d.selection_date < before_date
      or (d.selection_date = before_date and before_draw is not null and d.id < before_draw)
    )
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = d.selected_user_id
    )
  order by d.selection_date desc, d.id desc
  limit least(greatest(page_limit, 1), 50);
$$;

comment on function public.get_archive_page is
  'Stable cursor Archive, newest first. There is no popularity ordering.';

create or replace function public.get_yesterdays_human()
returns table (
  draw_id uuid,
  selection_date date,
  human_number integer,
  display_name text,
  country_code char(2),
  city text,
  photo_path text,
  is_removed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    d.selection_date,
    d.human_number,
    case when d.redacted_at is null then p.display_name end,
    case when d.redacted_at is null then p.country_code end,
    case when d.redacted_at is null and not p.city_hidden then p.city end,
    case when d.redacted_at is null then po.photo_path end,
    (d.redacted_at is not null or d.selected_user_id is null)
  from public.daily_draws d
  left join public.profiles p on p.id = d.selected_user_id
  left join public.portraits po on po.draw_id = d.id and po.status = 'approved'
  where d.selection_status in ('live', 'completed')
    and d.selection_date = (now() at time zone 'utc')::date - 1
    and d.human_number is not null
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = d.selected_user_id
    )
  limit 1;
$$;

create or replace function public.get_remembered_humans(
  page_limit integer default 24,
  before_remembered_at timestamptz default null,
  before_draw uuid default null
)
returns table (
  draw_id uuid,
  selection_date date,
  human_number integer,
  display_name text,
  country_code char(2),
  city text,
  photo_path text,
  is_removed boolean,
  remembered_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    d.selection_date,
    d.human_number,
    case when d.redacted_at is null then p.display_name end,
    case when d.redacted_at is null then p.country_code end,
    case when d.redacted_at is null and not p.city_hidden then p.city end,
    case when d.redacted_at is null then po.photo_path end,
    (d.redacted_at is not null or d.selected_user_id is null),
    r.created_at
  from public.remembers r
  join public.daily_draws d on d.id = r.draw_id
  left join public.profiles p on p.id = d.selected_user_id
  left join public.portraits po on po.draw_id = d.id and po.status = 'approved'
  where r.user_id = (select auth.uid())
    and d.selection_status in ('live', 'completed')
    and d.human_number is not null
    and (
      before_remembered_at is null
      or r.created_at < before_remembered_at
      or (
        r.created_at = before_remembered_at
        and before_draw is not null and r.draw_id < before_draw
      )
    )
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = d.selected_user_id
    )
  order by r.created_at desc, r.draw_id desc
  limit least(greatest(page_limit, 1), 50);
$$;

revoke execute on function public.get_archive_page(char(2), integer, integer, date, uuid)
  from public;
revoke execute on function public.get_yesterdays_human() from public;
revoke execute on function public.get_remembered_humans(integer, timestamptz, uuid)
  from public, anon;
grant execute on function public.get_archive_page(char(2), integer, integer, date, uuid)
  to anon, authenticated;
grant execute on function public.get_yesterdays_human() to anon, authenticated;
grant execute on function public.get_remembered_humans(integer, timestamptz, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Additive portrait and question translations
-- ---------------------------------------------------------------------------

-- Phase 2 redaction must cover the translation reader too. The original text
-- and every translated copy disappear through the same public boundary.
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
  join public.portraits po on po.id = tr.portrait_id
  join public.daily_draws d on d.id = po.draw_id
  where d.id = target_draw
    and tr.locale = target_locale
    and po.status = 'approved'
    and d.selection_status in ('live', 'completed')
    and d.redacted_at is null
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = po.user_id
    );
$$;

create type public.question_translation_field as enum ('body', 'answer');

create table public.question_translations (
  question_id uuid not null references public.questions (id) on delete cascade,
  field public.question_translation_field not null,
  locale text not null,
  translated_text text not null,
  engine text not null,
  translated_at timestamptz not null default now(),
  primary key (question_id, field, locale),
  constraint question_translations_locale check (locale in ('en', 'fr', 'de')),
  constraint question_translations_text check (char_length(btrim(translated_text)) > 0)
);

create index question_translations_reader
  on public.question_translations (question_id, locale, field);
alter table public.question_translations enable row level security;
revoke all on public.question_translations from anon, authenticated;

create or replace function public.get_question_translations(
  target_draw uuid,
  target_locale text
)
returns table (
  question_id uuid,
  translated_body text,
  translated_answer text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    q.id,
    max(tr.translated_text) filter (where tr.field = 'body'),
    max(tr.translated_text) filter (where tr.field = 'answer')
  from public.questions q
  join public.daily_draws d on d.id = q.draw_id
  join public.question_translations tr on tr.question_id = q.id
    and tr.locale = target_locale
  where q.draw_id = target_draw
    and q.status = 'approved'
    and d.selection_status in ('live', 'completed')
    and d.redacted_at is null
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = q.author_id
    )
  group by q.id;
$$;

create or replace function public.pending_question_translations(
  batch_size integer default 50
)
returns table (
  question_id uuid,
  field public.question_translation_field,
  original_text text,
  target_locale text
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, source.field, source.original_text, locales.code
  from public.questions q
  join public.daily_draws d on d.id = q.draw_id
  cross join lateral (values
    ('body'::public.question_translation_field, q.body),
    ('answer'::public.question_translation_field, q.answer)
  ) source(field, original_text)
  cross join (values ('en'), ('fr'), ('de')) locales(code)
  where q.status = 'approved'
    and d.selection_status in ('live', 'completed')
    and d.redacted_at is null
    and source.original_text is not null
    and not exists (
      select 1 from public.question_translations tr
      where tr.question_id = q.id and tr.field = source.field
        and tr.locale = locales.code
    )
  order by d.selection_date desc, q.created_at, source.field
  limit greatest(batch_size, 0);
$$;

create or replace function public.record_question_translation(
  target_question uuid,
  target_field public.question_translation_field,
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
  insert into public.question_translations (
    question_id, field, locale, translated_text, engine
  ) values (
    target_question, target_field, target_locale, text_value, translation_engine
  ) on conflict (question_id, field, locale) do update set
    translated_text = excluded.translated_text,
    engine = excluded.engine,
    translated_at = now();
  return true;
end;
$$;

create or replace function public.record_same_question_language(
  target_question uuid,
  target_field public.question_translation_field,
  target_locale text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  original text;
begin
  select case target_field when 'body' then q.body else q.answer end
  into original from public.questions q where q.id = target_question;
  if original is null then return false; end if;
  return public.record_question_translation(
    target_question, target_field, target_locale, original, 'source'
  );
end;
$$;

revoke execute on function public.get_question_translations(uuid, text) from public;
revoke execute on function public.pending_question_translations(integer)
  from public, anon, authenticated;
revoke execute on function public.record_question_translation(
  uuid, public.question_translation_field, text, text, text
) from public, anon, authenticated;
revoke execute on function public.record_same_question_language(
  uuid, public.question_translation_field, text
) from public, anon, authenticated;
grant execute on function public.get_question_translations(uuid, text)
  to anon, authenticated;

-- The translation worker authenticates with the service role. Earlier queue
-- functions correctly denied clients but omitted this positive grant, which
-- left the scheduled job unable to consume its own queue.
grant execute on function public.pending_translations(integer) to service_role;
grant execute on function public.record_translation(
  uuid, public.portrait_element_key, text, text, text
) to service_role;
grant execute on function public.record_same_language(
  uuid, public.portrait_element_key, text
) to service_role;
grant execute on function public.pending_question_translations(integer)
  to service_role;
grant execute on function public.record_question_translation(
  uuid, public.question_translation_field, text, text, text
) to service_role;
grant execute on function public.record_same_question_language(
  uuid, public.question_translation_field, text
) to service_role;

-- Keep the Phase 2 export complete as new derived personal data is introduced.
alter function public.export_my_data() rename to export_my_data_phase2;
revoke execute on function public.export_my_data_phase2()
  from public, anon, authenticated;

create or replace function public.export_my_data()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select (
    jsonb_set(public.export_my_data_phase2()::jsonb, '{schema_version}', '3'::jsonb)
    || jsonb_build_object(
      'portrait_translations', coalesce((
        select jsonb_agg(to_jsonb(tr) - 'portrait_id' order by tr.translated_at)
        from public.portrait_element_translations tr
        join public.portraits po on po.id = tr.portrait_id
        where po.user_id = (select auth.uid())
      ), '[]'::jsonb),
      'question_translations', coalesce((
        select jsonb_agg(to_jsonb(tr) - 'question_id' order by tr.translated_at)
        from public.question_translations tr
        join public.questions q on q.id = tr.question_id
        join public.daily_draws d on d.id = q.draw_id
        where q.author_id = (select auth.uid())
           or d.selected_user_id = (select auth.uid())
      ), '[]'::jsonb)
    )
  )::json;
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
