-- Phase 6 — the Human Portrait
--
-- The plan is blunt about why this phase exists: a blank textbox produces
-- "Hi guys, I'm John", and that kills the product. The portrait is therefore
-- a set of specific prompts, and the schema stores answers *against* those
-- prompts rather than as free text — so the question a person was answering is
-- never lost, and Phase 7 can show it above their answer.

create type public.portrait_status as enum (
  'draft',
  'submitted',
  'in_review',
  'approved',
  'rejected'
);

/*
 * The seven written prompts. Photo and optional media are files, handled
 * separately. Article 9.1 asks for 5-7 of the nine elements at MVP: these
 * seven, of which five are required, plus the photo.
 */
create type public.portrait_element_key as enum (
  'introduction',
  'where_im_from',
  'today_i_feel',
  'something_i_love',
  'something_misunderstood',
  'ordinary_moment',
  'something_id_tell_the_world'
);

create table public.portraits (
  id uuid primary key default extensions.gen_random_uuid(),

  -- One portrait per cycle, and it belongs to the person who was drawn.
  draw_id uuid not null unique references public.daily_draws (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,

  status public.portrait_status not null default 'draft',

  -- Storage paths, not URLs. The bucket is private; Phase 7 issues signed URLs.
  photo_path text,
  media_path text,

  submitted_at timestamptz,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint portraits_submitted_consistent check (
    (status = 'draft' and submitted_at is null)
    or (status <> 'draft' and submitted_at is not null)
  )
);

comment on table public.portraits is
  'One guided portrait per cycle. Moderated by a person before publication (Article 8.1).';

create index idx_portraits_user on public.portraits (user_id);
create index idx_portraits_review on public.portraits (status)
  where status in ('submitted', 'in_review');

create table public.portrait_elements (
  portrait_id uuid not null references public.portraits (id) on delete cascade,
  element_key public.portrait_element_key not null,
  answer text not null,
  updated_at timestamptz not null default now(),

  primary key (portrait_id, element_key),

  -- Long enough to say something, short enough to stay readable. The
  -- introduction is deliberately tighter than the rest.
  constraint portrait_elements_answer_length check (
    char_length(btrim(answer)) between 10 and 600
  ),
  constraint portrait_elements_introduction_length check (
    element_key <> 'introduction'
    or char_length(btrim(answer)) <= 200
  )
);

comment on table public.portrait_elements is
  'One answer per prompt. Storing the prompt key keeps the question with the answer.';

alter table public.portraits enable row level security;
alter table public.portrait_elements enable row level security;

create or replace function public.touch_portrait_updated_at()
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

create trigger portraits_touch_updated_at
  before update on public.portraits
  for each row execute function public.touch_portrait_updated_at();

create trigger portrait_elements_touch_updated_at
  before update on public.portrait_elements
  for each row execute function public.touch_portrait_updated_at();

-- ---------------------------------------------------------------------------
-- Editing is only possible while it is a draft
-- ---------------------------------------------------------------------------
--
-- Once submitted, a portrait is what the moderator reviewed. Letting the
-- author edit it afterwards would make review meaningless: the text approved
-- and the text published could differ.

create or replace function public.reject_edit_after_submission()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  portrait_status public.portrait_status;
begin
  select p.status into portrait_status
  from public.portraits p
  where p.id = coalesce(new.portrait_id, old.portrait_id);

  if portrait_status <> 'draft' then
    raise exception 'This portrait has been submitted and can no longer be edited'
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger portrait_elements_draft_only
  before insert or update or delete on public.portrait_elements
  for each row execute function public.reject_edit_after_submission();

-- ---------------------------------------------------------------------------
-- Starting and submitting
-- ---------------------------------------------------------------------------

create or replace function public.start_my_portrait()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_draw uuid;
  portrait_id uuid;
begin
  -- Only the person who accepted the current cycle may have a portrait, and
  -- only for that cycle.
  select d.id into target_draw
  from public.daily_draws d
  where d.selected_user_id = (select auth.uid())
    and d.selection_status in ('accepted', 'content_review')
  order by d.selection_date desc
  limit 1;

  if target_draw is null then
    return null;
  end if;

  insert into public.portraits (draw_id, user_id)
  values (target_draw, (select auth.uid()))
  on conflict (draw_id) do nothing
  returning id into portrait_id;

  if portrait_id is null then
    select p.id into portrait_id
    from public.portraits p
    where p.draw_id = target_draw;
  end if;

  return portrait_id;
end;
$$;

create or replace function public.submit_my_portrait()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  portrait public.portraits;
  answered integer;
begin
  select p.* into portrait
  from public.portraits p
  where p.user_id = (select auth.uid())
    and p.status = 'draft'
  order by p.created_at desc
  limit 1;

  if not found then
    return false;
  end if;

  if portrait.photo_path is null then
    raise exception 'A portrait needs a photograph'
      using errcode = 'check_violation';
  end if;

  select count(*) into answered
  from public.portrait_elements e
  where e.portrait_id = portrait.id;

  -- Article 9.1 — five of the seven written prompts at MVP. Everything beyond
  -- the minimum is the author's choice, and skipping one is never shown as an
  -- absence.
  if answered < 5 then
    raise exception 'Answer at least five prompts before submitting'
      using errcode = 'check_violation';
  end if;

  update public.portraits
  set status = 'submitted', submitted_at = now()
  where id = portrait.id;

  -- Nothing reaches the world unreviewed (Article 1.12).
  update public.daily_draws
  set selection_status = 'content_review'
  where id = portrait.draw_id;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.portraits from anon, authenticated;
revoke all on public.portrait_elements from anon, authenticated;

grant select on public.portraits to authenticated;
-- status, submitted_at and reviewed_at are absent: the author writes their
-- content, the system writes the state.
grant update (photo_path, media_path) on public.portraits to authenticated;

grant select, insert, update, delete on public.portrait_elements to authenticated;

create policy portraits_select_own
  on public.portraits for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy portraits_update_own_draft
  on public.portraits for update
  to authenticated
  using ((select auth.uid()) = user_id and status = 'draft')
  with check ((select auth.uid()) = user_id and status = 'draft');

create policy portrait_elements_own
  on public.portrait_elements for all
  to authenticated
  using (
    exists (
      select 1 from public.portraits p
      where p.id = portrait_id and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.portraits p
      where p.id = portrait_id
        and p.user_id = (select auth.uid())
        and p.status = 'draft'
    )
  );

revoke execute on function public.start_my_portrait() from public, anon;
revoke execute on function public.submit_my_portrait() from public, anon;
revoke execute on function public.touch_portrait_updated_at()
  from public, anon, authenticated;
revoke execute on function public.reject_edit_after_submission()
  from public, anon, authenticated;

grant execute on function public.start_my_portrait() to authenticated;
grant execute on function public.submit_my_portrait() to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
--
-- Both buckets are private. A portrait photograph must not be reachable by
-- guessing a URL before the cycle goes live, so Phase 7 serves it through
-- signed URLs rather than making the bucket public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('portraits', 'portraits', false, 20971520,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/mpeg', 'audio/mp4'])
on conflict (id) do nothing;

-- Everyone writes into a folder named after their own user id, which is what
-- makes "your own files" expressible as a policy at all.
create policy storage_avatars_own
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_portraits_own
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'portraits'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'portraits'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
