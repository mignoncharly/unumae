-- Phase 2 -- complete safety and privacy
--
-- Content removal is not account deletion. A published Human keeps their
-- permanent number and date while every identifying field and media path is
-- withheld. Blocks are addressed through public content ids, never private
-- profile ids. Appeals are reviewed by somebody other than the original
-- moderator. Every privileged action remains an append-only moderation event.

-- ---------------------------------------------------------------------------
-- 1. Durable removal, user-facing requests and appeals
-- ---------------------------------------------------------------------------

-- These values are consumed by the following migration, after this enum
-- alteration has committed. Appeal/removal reviews are privileged decisions
-- and belong in the same append-only audit trail as content decisions.
alter type public.moderation_action add value if not exists 'appeal_upheld';
alter type public.moderation_action add value if not exists 'appeal_overturned';
alter type public.moderation_action add value if not exists 'archive_removal_approved';
alter type public.moderation_action add value if not exists 'archive_removal_declined';

alter table public.daily_draws
  add column redacted_at timestamptz,
  add column redacted_by uuid references public.profiles (id) on delete set null,
  add column redaction_reason text,
  add constraint daily_draws_redaction_consistent check (
    (redacted_at is null and redacted_by is null and redaction_reason is null)
    or redacted_at is not null
  ),
  add constraint daily_draws_redaction_reason_length check (
    redaction_reason is null or char_length(redaction_reason) <= 1000
  );

comment on column public.daily_draws.redacted_at is
  'When set, public readers return only the permanent Human number and date.';

alter table public.user_blocks
  add column id uuid not null default extensions.gen_random_uuid();

alter table public.user_blocks
  add constraint user_blocks_id_unique unique (id);

create type public.archive_removal_status as enum (
  'pending', 'approved', 'declined', 'cancelled'
);

create table public.archive_removal_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  draw_id uuid not null references public.daily_draws (id) on delete cascade,
  requester_id uuid references public.profiles (id) on delete set null,
  reason text,
  status public.archive_removal_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution_note text,
  constraint archive_removal_reason_length check (
    reason is null or char_length(reason) <= 1000
  ),
  constraint archive_removal_resolution_length check (
    resolution_note is null or char_length(resolution_note) <= 1000
  ),
  constraint archive_removal_resolution_consistent check (
    (status = 'pending' and resolved_at is null)
    or (status <> 'pending' and resolved_at is not null)
  )
);

create unique index archive_removal_one_open_per_draw
  on public.archive_removal_requests (draw_id)
  where status = 'pending';

create index archive_removal_requester
  on public.archive_removal_requests (requester_id, created_at desc);

alter table public.archive_removal_requests enable row level security;
revoke all on public.archive_removal_requests from anon, authenticated;

create type public.appeal_status as enum ('pending', 'upheld', 'overturned');

create table public.moderation_appeals (
  id uuid primary key default extensions.gen_random_uuid(),
  appellant_id uuid references public.profiles (id) on delete set null,
  original_event_id uuid not null references public.moderation_events (id),
  original_moderator_id uuid references public.profiles (id) on delete set null,
  statement text not null,
  status public.appeal_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution_note text,
  constraint moderation_appeals_statement_length check (
    char_length(btrim(statement)) between 10 and 1000
  ),
  constraint moderation_appeals_resolution_length check (
    resolution_note is null or char_length(resolution_note) <= 1000
  ),
  constraint moderation_appeals_different_reviewer check (
    resolved_by is null or original_moderator_id is null
    or resolved_by <> original_moderator_id
  ),
  constraint moderation_appeals_resolution_consistent check (
    (status = 'pending' and resolved_at is null and resolved_by is null)
    or (status <> 'pending' and resolved_at is not null and resolved_by is not null)
  ),
  unique (appellant_id, original_event_id)
);

create index moderation_appeals_pending
  on public.moderation_appeals (created_at)
  where status = 'pending';

alter table public.moderation_appeals enable row level security;
revoke all on public.moderation_appeals from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Blocking through content, with opaque management ids
-- ---------------------------------------------------------------------------

create or replace function public.block_content_author(
  target_type public.report_target,
  target_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = 'insufficient_privilege';
  end if;

  case target_type
    when 'question' then
      select q.author_id into target_user
      from public.questions q where q.id = target_id;
    when 'portrait' then
      select p.user_id into target_user
      from public.portraits p where p.id = target_id;
    when 'profile' then
      select p.id into target_user
      from public.profiles p where p.id = target_id;
  end case;

  if target_user is null then
    raise exception 'Target does not exist' using errcode = 'foreign_key_violation';
  end if;

  if target_user = (select auth.uid()) then
    return false;
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values ((select auth.uid()), target_user)
  on conflict (blocker_id, blocked_id) do nothing;

  return true;
end;
$$;

create or replace function public.my_blocked_users()
returns table (
  block_id uuid,
  display_name text,
  country_code char(2),
  avatar_path text,
  blocked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, p.display_name, p.country_code, p.avatar_path, b.created_at
  from public.user_blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = (select auth.uid())
  order by b.created_at desc;
$$;

create or replace function public.unblock_by_id(target_block uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.user_blocks
  where id = target_block and blocker_id = (select auth.uid());
  return found;
end;
$$;

-- The raw-id functions are no longer client capabilities.
revoke execute on function public.block_user(uuid) from authenticated;
revoke execute on function public.unblock_user(uuid) from authenticated;

revoke execute on function public.block_content_author(public.report_target, uuid)
  from public, anon;
revoke execute on function public.my_blocked_users() from public, anon;
revoke execute on function public.unblock_by_id(uuid) from public, anon;
grant execute on function public.block_content_author(public.report_target, uuid)
  to authenticated;
grant execute on function public.my_blocked_users() to authenticated;
grant execute on function public.unblock_by_id(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Independent Archive removal
-- ---------------------------------------------------------------------------

create or replace function public.my_archive_removal_options()
returns table (
  draw_id uuid,
  selection_date date,
  human_number integer,
  request_status public.archive_removal_status,
  requested_at timestamptz,
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
    r.status,
    r.created_at,
    d.redacted_at is not null
  from public.daily_draws d
  left join lateral (
    select ar.status, ar.created_at
    from public.archive_removal_requests ar
    where ar.draw_id = d.id and ar.requester_id = (select auth.uid())
    order by ar.created_at desc
    limit 1
  ) r on true
  where d.selected_user_id = (select auth.uid())
    and d.selection_status in ('live', 'completed')
    and d.human_number is not null
  order by d.selection_date desc;
$$;

create or replace function public.request_archive_removal(
  target_draw uuid,
  request_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_id uuid;
begin
  if not exists (
    select 1 from public.daily_draws d
    where d.id = target_draw
      and d.selected_user_id = (select auth.uid())
      and d.selection_status in ('live', 'completed')
      and d.human_number is not null
  ) then
    raise exception 'Not your published portrait' using errcode = 'insufficient_privilege';
  end if;

  if exists (
    select 1 from public.daily_draws d
    where d.id = target_draw and d.redacted_at is not null
  ) then
    raise exception 'Portrait already removed' using errcode = 'check_violation';
  end if;

  insert into public.archive_removal_requests (draw_id, requester_id, reason)
  values (
    target_draw,
    (select auth.uid()),
    nullif(btrim(coalesce(request_reason, '')), '')
  )
  returning id into request_id;

  return request_id;
end;
$$;

revoke execute on function public.my_archive_removal_options() from public, anon;
revoke execute on function public.request_archive_removal(uuid, text) from public, anon;
grant execute on function public.my_archive_removal_options() to authenticated;
grant execute on function public.request_archive_removal(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Appeals: the database enforces the second pair of eyes
-- ---------------------------------------------------------------------------

create or replace function public.my_appealable_decisions()
returns table (
  event_id uuid,
  action public.moderation_action,
  target_type public.report_target,
  reason text,
  decided_at timestamptz,
  appeal_status public.appeal_status,
  appeal_statement text,
  resolution_note text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id,
    e.action,
    e.target_type,
    e.reason,
    e.created_at,
    a.status,
    a.statement,
    a.resolution_note
  from public.moderation_events e
  left join public.moderation_appeals a
    on a.original_event_id = e.id and a.appellant_id = (select auth.uid())
  where e.subject_id = (select auth.uid())
    and e.action in (
      'question_rejected', 'account_suspended', 'account_banned',
      'archive_redacted'
    )
  order by e.created_at desc;
$$;

create or replace function public.submit_moderation_appeal(
  target_event uuid,
  appeal_statement text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  original_moderator uuid;
  appeal_id uuid;
begin
  select e.actor_id into original_moderator
  from public.moderation_events e
  where e.id = target_event
    and e.subject_id = (select auth.uid())
    and e.action in (
      'question_rejected', 'account_suspended', 'account_banned',
      'archive_redacted'
    );

  if not found then
    raise exception 'Decision is not appealable' using errcode = 'insufficient_privilege';
  end if;

  insert into public.moderation_appeals (
    appellant_id, original_event_id, original_moderator_id, statement
  ) values (
    (select auth.uid()), target_event, original_moderator, btrim(appeal_statement)
  ) returning id into appeal_id;

  return appeal_id;
end;
$$;

revoke execute on function public.my_appealable_decisions() from public, anon;
revoke execute on function public.submit_moderation_appeal(uuid, text)
  from public, anon;
grant execute on function public.my_appealable_decisions() to authenticated;
grant execute on function public.submit_moderation_appeal(uuid, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Public readers: tombstones and personal blocks are enforced at source
-- ---------------------------------------------------------------------------

drop function if exists public.get_todays_human();
drop function if exists public.get_human(uuid);

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
  founding boolean,
  is_removed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    case when d.redacted_at is null then po.id end,
    d.selection_date,
    d.human_number,
    case when d.redacted_at is null then pr.display_name end,
    case when d.redacted_at is null then pr.country_code end,
    case when d.redacted_at is null and not pr.city_hidden then pr.city end,
    case when d.redacted_at is null then po.photo_path end,
    d.published_at,
    case when d.redacted_at is null then public.joined_in_year_zero(pr.created_at) end,
    (d.redacted_at is not null or d.selected_user_id is null) as is_removed
  from public.daily_draws d
  left join public.profiles pr on pr.id = d.selected_user_id
  left join public.portraits po on po.draw_id = d.id and po.status = 'approved'
  where d.selection_status = 'live'
    and d.selection_date = (now() at time zone 'utc')::date
    and d.human_number is not null
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = d.selected_user_id
    )
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
    case when d.redacted_at is null then pr.display_name end,
    case when d.redacted_at is null then pr.country_code end,
    case when d.redacted_at is null and not pr.city_hidden then pr.city end,
    case when d.redacted_at is null then po.photo_path end,
    (d.redacted_at is not null or d.selected_user_id is null) as is_removed
  from public.daily_draws d
  left join public.profiles pr on pr.id = d.selected_user_id
  left join public.portraits po on po.draw_id = d.id and po.status = 'approved'
  where d.selection_status in ('live', 'completed')
    and d.human_number is not null
    and (filter_country is null or (d.redacted_at is null and pr.country_code = filter_country))
    and (filter_year is null or extract(year from d.selection_date)::integer = filter_year)
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = d.selected_user_id
    )
  order by d.selection_date desc
  limit least(greatest(page_limit, 1), 100)
  offset greatest(page_offset, 0);
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
  is_removed boolean,
  founding boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    case when d.redacted_at is null then po.id end,
    d.selection_date,
    d.human_number,
    case when d.redacted_at is null then pr.display_name end,
    case when d.redacted_at is null then pr.country_code end,
    case when d.redacted_at is null and not pr.city_hidden then pr.city end,
    case when d.redacted_at is null then po.photo_path end,
    d.published_at,
    (d.redacted_at is not null or d.selected_user_id is null) as is_removed,
    case when d.redacted_at is null then public.joined_in_year_zero(pr.created_at) end
  from public.daily_draws d
  left join public.profiles pr on pr.id = d.selected_user_id
  left join public.portraits po on po.draw_id = d.id and po.status = 'approved'
  where d.id = target_draw
    and d.selection_status in ('live', 'completed')
    and d.human_number is not null
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = d.selected_user_id
    );
$$;

create or replace function public.get_portrait_elements(target_draw uuid)
returns table (element_key public.portrait_element_key, answer text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.element_key, e.answer
  from public.portrait_elements e
  join public.portraits p on p.id = e.portrait_id
  join public.daily_draws d on d.id = p.draw_id
  where p.draw_id = target_draw
    and p.status = 'approved'
    and d.selection_status in ('live', 'completed')
    and d.redacted_at is null
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = p.user_id
    )
  order by e.element_key;
$$;

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
    q.id, q.body, q.answer, q.answered_at,
    count(v.user_id), bool_or(v.user_id = (select auth.uid()))
  from public.questions q
  left join public.question_votes v on v.question_id = q.id
  join public.daily_draws d on d.id = q.draw_id
  where q.draw_id = target_draw
    and q.status = 'approved'
    and d.selection_status in ('live', 'completed')
    and d.redacted_at is null
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = q.author_id
    )
  group by q.id
  order by count(v.user_id) desc, q.created_at asc;
$$;

create or replace function public.get_anniversaries()
returns table (
  years_ago integer,
  draw_id uuid,
  selection_date date,
  human_number integer,
  display_name text,
  country_code char(2),
  photo_path text,
  is_removed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    y.years_ago, d.id, d.selection_date, d.human_number,
    case when d.redacted_at is null then pr.display_name end,
    case when d.redacted_at is null then pr.country_code end,
    case when d.redacted_at is null then po.photo_path end,
    (d.redacted_at is not null or d.selected_user_id is null) as is_removed
  from (values (1), (5), (10), (25)) as y (years_ago)
  join public.daily_draws d on d.selection_date =
    ((now() at time zone 'utc')::date - (y.years_ago || ' years')::interval)::date
  left join public.profiles pr on pr.id = d.selected_user_id
  left join public.portraits po on po.draw_id = d.id and po.status = 'approved'
  where d.selection_status in ('live', 'completed')
    and d.human_number is not null
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = d.selected_user_id
    )
  order by y.years_ago;
$$;

create or replace function public.get_archive_countries()
returns table (country_code char(2), humans integer)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.country_code, count(*)::integer
  from public.daily_draws d
  join public.profiles pr on pr.id = d.selected_user_id
  where d.selection_status in ('live', 'completed')
    and d.human_number is not null
    and d.redacted_at is null
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = d.selected_user_id
    )
  group by pr.country_code
  order by pr.country_code asc;
$$;

-- Years count tombstones because dates remain part of the Archive.
create or replace function public.get_archive_years()
returns table (year integer, humans integer)
language sql
stable
security definer
set search_path = ''
as $$
  select extract(year from d.selection_date)::integer, count(*)::integer
  from public.daily_draws d
  where d.selection_status in ('live', 'completed')
    and d.human_number is not null
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = d.selected_user_id
    )
  group by 1 order by 1 desc;
$$;

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
    where (p.photo_path = object_name or p.media_path = object_name)
      and p.status = 'approved'
      and d.selection_status in ('live', 'completed')
      and d.redacted_at is null
      and not exists (
        select 1 from public.user_blocks b
        where b.blocker_id = (select auth.uid()) and b.blocked_id = p.user_id
      )
  );
$$;

revoke execute on function public.get_todays_human() from public;
revoke execute on function public.get_human(uuid) from public;
grant execute on function public.get_todays_human() to anon, authenticated;
grant execute on function public.get_human(uuid) to anon, authenticated;

-- Moderators can inspect unpublished media through a short-lived signed URL.
drop policy if exists storage_portraits_moderator_read on storage.objects;
create policy storage_portraits_moderator_read
  on storage.objects for select to authenticated
  using (bucket_id = 'portraits' and public.is_moderator());

-- ---------------------------------------------------------------------------
-- 6. A complete data export, returned to the caller only
-- ---------------------------------------------------------------------------

create or replace function public.export_my_data()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'schema_version', 2,
    'exported_at', now(),
    'account', (
      select jsonb_build_object(
        'id', u.id, 'email', u.email, 'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'providers', coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb)
      ) from auth.users u where u.id = (select auth.uid())
    ),
    'profile', (
      select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())
    ),
    'selection_history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'selection_date', d.selection_date,
        'was_candidate', exists (
          select 1 from public.draw_candidates dc
          where dc.draw_id = d.id and dc.user_id = (select auth.uid())
        ),
        'was_selected', d.selected_user_id = (select auth.uid()),
        'human_number', case when d.selected_user_id = (select auth.uid()) then d.human_number end,
        'status', d.selection_status
      ) order by d.selection_date)
      from public.daily_draws d
      where d.selected_user_id = (select auth.uid())
         or exists (
           select 1 from public.draw_candidates dc
           where dc.draw_id = d.id and dc.user_id = (select auth.uid())
         )
    ), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(to_jsonb(i) - 'user_id' order by i.notified_at)
      from public.draw_invitations i where i.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'portraits', coalesce((
      select jsonb_agg((to_jsonb(p) - 'user_id') || jsonb_build_object(
        'responses', coalesce((
          select jsonb_agg(to_jsonb(e) - 'portrait_id' order by e.element_key)
          from public.portrait_elements e where e.portrait_id = p.id
        ), '[]'::jsonb)
      ) order by p.created_at)
      from public.portraits p where p.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'questions_authored', coalesce((
      select jsonb_agg(to_jsonb(q) - 'author_id' order by q.created_at)
      from public.questions q where q.author_id = (select auth.uid())
    ), '[]'::jsonb),
    'question_votes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'question_id', v.question_id, 'created_at', v.created_at
      ) order by v.created_at)
      from public.question_votes v where v.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'humans_i_remember', coalesce((
      select jsonb_agg(jsonb_build_object(
        'selection_date', d.selection_date, 'human_number', d.human_number,
        'remembered_at', r.created_at
      ) order by r.created_at)
      from public.remembers r join public.daily_draws d on d.id = r.draw_id
      where r.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'notification_settings', (
      select to_jsonb(n) - 'user_id' from public.notification_settings n
      where n.user_id = (select auth.uid())
    ),
    'registered_devices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'platform', p.platform, 'created_at', p.created_at,
        'last_seen_at', p.last_seen_at
      ) order by p.created_at)
      from public.push_tokens p where p.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'notifications_sent', coalesce((
      select jsonb_agg(to_jsonb(n) - 'id' - 'user_id' order by n.sent_at)
      from public.notification_log n where n.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'notification_deliveries', coalesce((
      select jsonb_agg(to_jsonb(n) - 'id' - 'user_id' order by n.attempted_at)
      from public.notification_deliveries n where n.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'analytics_events', coalesce((
      select jsonb_agg(to_jsonb(a) - 'id' - 'user_id' order by a.created_at)
      from public.analytics_events a where a.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'reports_i_made', coalesce((
      select jsonb_agg(to_jsonb(c) - 'reporter_id' - 'resolved_by' order by c.created_at)
      from public.content_reports c where c.reporter_id = (select auth.uid())
    ), '[]'::jsonb),
    'blocked_people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'display_name', p.display_name, 'country_code', p.country_code,
        'blocked_at', b.created_at
      ) order by b.created_at)
      from public.user_blocks b join public.profiles p on p.id = b.blocked_id
      where b.blocker_id = (select auth.uid())
    ), '[]'::jsonb),
    'moderation_decisions_about_me', coalesce((
      select jsonb_agg(jsonb_build_object(
        'action', e.action, 'target_type', e.target_type,
        'reason', e.reason, 'created_at', e.created_at
      ) order by e.created_at)
      from public.moderation_events e where e.subject_id = (select auth.uid())
    ), '[]'::jsonb),
    'appeals', coalesce((
      select jsonb_agg(to_jsonb(a) - 'appellant_id' - 'original_moderator_id' - 'resolved_by' order by a.created_at)
      from public.moderation_appeals a where a.appellant_id = (select auth.uid())
    ), '[]'::jsonb),
    'archive_removal_requests', coalesce((
      select jsonb_agg(to_jsonb(r) - 'requester_id' - 'resolved_by' order by r.created_at)
      from public.archive_removal_requests r where r.requester_id = (select auth.uid())
    ), '[]'::jsonb)
  )::json;
$$;

-- A sign-out is complete only after every device token for this account is gone.
create or replace function public.unregister_my_push_tokens()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.push_tokens where user_id = (select auth.uid());
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function public.export_my_data() from public, anon;
revoke execute on function public.unregister_my_push_tokens() from public, anon;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.unregister_my_push_tokens() to authenticated;

-- The Archive's random reader uses random(); STABLE was an incorrect promise
-- in the original Archive migration and PostgreSQL's linter rightly flags it.
alter function public.get_random_human(char(2)) volatile;
