-- Phase 9 — give the readers a portrait id
--
-- `report_content` takes a target type and a target id, and the moderation
-- queue is keyed on the portrait. But get_todays_human and get_human returned
-- only the draw id, so a client reporting a portrait would have had to send the
-- wrong identifier under the right label — a mismatch nobody would notice until
-- a moderator opened a report that pointed at nothing.

create or replace function public.get_todays_human()
returns table (
  draw_id uuid,
  portrait_id uuid,
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
    po.id,
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

create or replace function public.get_human(target_draw uuid)
returns table (
  draw_id uuid,
  portrait_id uuid,
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
    po.id,
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
