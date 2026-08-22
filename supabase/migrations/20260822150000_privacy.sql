-- Phase 9 — privacy, and making blocking mean something
--
-- Two gaps this closes:
--
--   1. Article 8.2 says the city is "optional and hideable". It was optional,
--      but the only way to hide it was to delete it — so a person who wanted
--      it private today and public later had to retype it. Hiding and erasing
--      are different decisions.
--
--   2. Blocking existed as a row and changed nothing anybody could see. A
--      block that does not remove somebody from your view is a placebo.

alter table public.profiles
  add column city_hidden boolean not null default false;

comment on column public.profiles.city_hidden is
  'Keeps the city stored but unpublished (Article 8.2). The user decides.';

grant update (city_hidden) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Republish the readers, respecting the choice
-- ---------------------------------------------------------------------------

create or replace function public.get_todays_human()
returns table (
  draw_id uuid,
  selection_date date,
  human_number integer,
  display_name text,
  country_code char(2),
  city text,
  photo_path text,
  published_at timestamptz
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
    pr.display_name,
    pr.country_code,
    case when pr.city_hidden then null else pr.city end,
    po.photo_path,
    d.published_at
  from public.daily_draws d
  join public.profiles pr on pr.id = d.selected_user_id
  join public.portraits po on po.draw_id = d.id
  where d.selection_status = 'live'
    and po.status = 'approved'
  order by d.selection_date desc
  limit 1;
$$;

create or replace function public.get_archive(
  filter_country char(2) default null,
  filter_year integer default null,
  page_limit integer default 30,
  page_offset integer default 0
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
    pr.display_name,
    pr.country_code,
    case when pr.city_hidden then null else pr.city end,
    po.photo_path,
    (d.selected_user_id is null) as is_removed
  from public.daily_draws d
  left join public.profiles pr on pr.id = d.selected_user_id
  left join public.portraits po
    on po.draw_id = d.id and po.status = 'approved'
  where d.selection_status in ('live', 'completed')
    and d.human_number is not null
    and (filter_country is null or pr.country_code = filter_country)
    and (
      filter_year is null
      or extract(year from d.selection_date)::integer = filter_year
    )
  order by d.selection_date desc
  limit least(greatest(page_limit, 1), 100)
  offset greatest(page_offset, 0);
$$;

create or replace function public.get_human(target_draw uuid)
returns table (
  draw_id uuid,
  selection_date date,
  human_number integer,
  display_name text,
  country_code char(2),
  city text,
  photo_path text,
  published_at timestamptz,
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
    pr.display_name,
    pr.country_code,
    case when pr.city_hidden then null else pr.city end,
    po.photo_path,
    d.published_at,
    (d.selected_user_id is null) as is_removed
  from public.daily_draws d
  left join public.profiles pr on pr.id = d.selected_user_id
  left join public.portraits po
    on po.draw_id = d.id and po.status = 'approved'
  where d.id = target_draw
    and d.selection_status in ('live', 'completed')
    and d.human_number is not null;
$$;

-- ---------------------------------------------------------------------------
-- Blocking, applied
-- ---------------------------------------------------------------------------
--
-- A blocked person's questions disappear from the blocker's view, immediately
-- and without anyone's approval. They stay visible to everybody else: blocking
-- is a personal filter, not a moderation decision, and one person must not be
-- able to remove another's words from the world by pressing a button.

create or replace function public.get_questions(target_draw uuid)
returns table (
  id uuid,
  body text,
  answer text,
  answered_at timestamptz,
  votes bigint,
  has_voted boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    q.id,
    q.body,
    q.answer,
    q.answered_at,
    count(v.user_id) as votes,
    bool_or(v.user_id = (select auth.uid())) as has_voted
  from public.questions q
  left join public.question_votes v on v.question_id = q.id
  join public.daily_draws d on d.id = q.draw_id
  where q.draw_id = target_draw
    and q.status = 'approved'
    and d.selection_status in ('live', 'completed')
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid())
        and b.blocked_id = q.author_id
    )
  group by q.id
  order by count(v.user_id) desc, q.created_at asc;
$$;

-- ---------------------------------------------------------------------------
-- Liveness before publication (Article 8.5)
-- ---------------------------------------------------------------------------
--
-- The gate exists and is off. Turning it on with no capture flow would make
-- every cycle a Quiet Day, so the switch lives in app_settings and the
-- condition is written now rather than remembered later.

create or replace function public.publish_due_cycles()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'utc')::date;
  published integer := 0;
  liveness_required boolean;
begin
  select value into liveness_required
  from public.app_settings
  where key = 'require_liveness_before_publication';

  update public.daily_draws
  set selection_status = 'completed'
  where selection_status = 'live'
    and selection_date < today;

  with due as (
    select d.id
    from public.daily_draws d
    join public.portraits p on p.draw_id = d.id
    join public.profiles pr on pr.id = d.selected_user_id
    where d.selection_date = today
      and d.selection_status = 'ready'
      and p.status = 'approved'
      and (
        not coalesce(liveness_required, false)
        or pr.verification_level = 'liveness'
      )
  )
  update public.daily_draws d
  set selection_status = 'live',
      published_at = now(),
      human_number = nextval('public.human_number_seq')
  from due
  where d.id = due.id;

  get diagnostics published = row_count;
  return published;
end;
$$;

/*
 * Recorded by the verification service, never by a client. It exists now so
 * the switch above has something to turn on, and so the column it writes is
 * unambiguous when the capture flow arrives.
 */
create or replace function public.record_liveness_check(target_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set verification_level = 'liveness'
  where id = target_user
    and account_status = 'active';

  return found;
end;
$$;

revoke execute on function public.record_liveness_check(uuid)
  from public, anon, authenticated;
