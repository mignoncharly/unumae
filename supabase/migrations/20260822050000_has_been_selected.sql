-- The client cannot read daily_draws.selected_user_id — that column is granted
-- to nobody, so a pending draw cannot leak tomorrow's human.
--
-- But a user is entitled to know one thing about it: whether they have already
-- been Today's Human, because that is the one permanent reason they will never
-- be drawn again (Article 5.4). This answers exactly that question, about the
-- caller and nobody else.

create or replace function public.has_been_selected()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.daily_draws d
    where d.selected_user_id = (select auth.uid())
  );
$$;

comment on function public.has_been_selected is
  'Whether the calling user has already been Today''s Human. Takes no argument, so it cannot be asked about anyone else.';

revoke execute on function public.has_been_selected() from anon;
grant execute on function public.has_been_selected() to authenticated;
