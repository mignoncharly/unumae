-- Phase 0 — make the selected Human's journey a complete product loop.
--
-- A client previously had to infer the journey from several owner-only tables,
-- and there was no supported way for Today's Human to answer a question. These
-- two caller-scoped functions make the state machine explicit without exposing
-- another candidate, another invitation, or the selected_user_id column.

-- ---------------------------------------------------------------------------
-- 1. One source of truth for the caller's selected-Human journey
-- ---------------------------------------------------------------------------

create or replace function public.my_human_journey()
returns table (
  draw_id uuid,
  selection_date date,
  selection_status public.selection_status,
  invitation_id uuid,
  notified_at timestamptz,
  acceptance_deadline timestamptz,
  invitation_response public.invitation_response,
  portrait_id uuid,
  portrait_status public.portrait_status,
  portrait_submitted_at timestamptz,
  portrait_reviewed_at timestamptz,
  human_number integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    d.selection_date,
    d.selection_status,
    i.id,
    i.notified_at,
    i.acceptance_deadline,
    i.response,
    p.id,
    p.status,
    p.submitted_at,
    p.reviewed_at,
    d.human_number
  from public.draw_invitations i
  join public.daily_draws d on d.id = i.draw_id
  left join public.portraits p
    on p.draw_id = d.id
   and p.user_id = (select auth.uid())
  where i.user_id = (select auth.uid())
    and (
      i.response = 'accepted'
      or (
        i.response is null
        and d.selected_user_id = (select auth.uid())
      )
    )
  order by d.selection_date desc, i.notified_at desc
  limit 1;
$$;

comment on function public.my_human_journey is
  'The caller''s pending or accepted selected-Human journey, including portrait and publication state.';

revoke execute on function public.my_human_journey() from public, anon;
grant execute on function public.my_human_journey() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Today's Human may answer an approved question during their live day
-- ---------------------------------------------------------------------------

create or replace function public.answer_question(
  target_question uuid,
  answer_body text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_answer text := btrim(answer_body);
begin
  if (select auth.uid()) is null then
    return false;
  end if;

  if char_length(clean_answer) < 1 or char_length(clean_answer) > 2000 then
    raise exception 'An answer must be between 1 and 2000 characters'
      using errcode = 'check_violation';
  end if;

  update public.questions q
  set answer = clean_answer,
      answered_at = now()
  from public.daily_draws d
  where q.id = target_question
    and q.draw_id = d.id
    and q.status = 'approved'
    and d.selected_user_id = (select auth.uid())
    and d.selection_status = 'live'
    and d.selection_date = (now() at time zone 'utc')::date;

  return found;
end;
$$;

comment on function public.answer_question(uuid, text) is
  'Lets Today''s Human answer an approved question during that cycle''s live UTC day.';

revoke execute on function public.answer_question(uuid, text) from public, anon;
grant execute on function public.answer_question(uuid, text) to authenticated;

-- A delayed publication job must never make yesterday's Human look current.
-- At 00:00 UTC the public Today surface becomes empty until the new approved
-- cycle is published, instead of silently extending the previous person's day.
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
  published_at timestamptz,
  founding boolean
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
    public.joined_in_year_zero(pr.created_at)
  from public.daily_draws d
  join public.profiles pr on pr.id = d.selected_user_id
  join public.portraits po on po.draw_id = d.id
  where d.selection_status = 'live'
    and d.selection_date = (now() at time zone 'utc')::date
    and po.status = 'approved'
  limit 1;
$$;

revoke execute on function public.get_todays_human() from public;
grant execute on function public.get_todays_human() to anon, authenticated;
