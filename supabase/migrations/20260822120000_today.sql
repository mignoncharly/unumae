-- Phase 7 — Today's Human: publication, questions, voting, Remember
--
-- Everything before this phase produced a person and a portrait that nobody
-- could see. This migration is what makes a cycle public, and it is where the
-- constitution's rules about the daily loop become schema:
--
--   Article 9.2  questions are 180 characters, and moderated before they show
--   Article 9.3  upvote only — there is no direction column to set to -1
--   Article 9.4  the Remember count is never exposed, to anyone, anywhere
--   Article 1.12 nothing reaches the world unreviewed

-- ---------------------------------------------------------------------------
-- 1. The human number
-- ---------------------------------------------------------------------------
--
-- Assigned when a cycle goes live, not when it is drawn: a cancelled draw must
-- not consume a number, or the Archive would have gaps that mean nothing.

create sequence if not exists public.human_number_seq start 1;

alter table public.daily_draws
  add column human_number integer unique;

comment on column public.daily_draws.human_number is
  'HUMAN #0128. Assigned at publication so cancelled cycles consume no number.';

-- ---------------------------------------------------------------------------
-- 2. Questions
-- ---------------------------------------------------------------------------

create type public.question_status as enum (
  'pending',
  'approved',
  'rejected'
);

create table public.questions (
  id uuid primary key default extensions.gen_random_uuid(),
  draw_id uuid not null references public.daily_draws (id) on delete cascade,

  -- A question is personal data, so it leaves with its author.
  author_id uuid not null references public.profiles (id) on delete cascade,

  body text not null,
  status public.question_status not null default 'pending',

  -- Today's Human answers what they choose to answer (Article 6.3).
  answer text,
  answered_at timestamptz,

  created_at timestamptz not null default now(),

  -- Article 9.2 — short questions produce answerable questions.
  constraint questions_body_length
    check (char_length(btrim(body)) between 10 and 180),
  constraint questions_answer_length
    check (answer is null or char_length(btrim(answer)) between 1 and 2000),
  constraint questions_answered_consistent
    check ((answer is null) = (answered_at is null))
);

create index idx_questions_draw on public.questions (draw_id, status);
create index idx_questions_author on public.questions (author_id);

/*
 * Article 9.3 — upvote only.
 *
 * There is no `direction` or `value` column. A downvote is not disabled here,
 * it is unrepresentable: the only thing a row can say is "this person asked
 * for this question". The primary key is the one-vote-per-person rule.
 */
create table public.question_votes (
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

/*
 * Article 9.4 — Remember is a private library, not a scoreboard.
 *
 * No count is exposed by any function, view or grant in this file. The only
 * person who can see a row is the person who created it.
 */
create table public.remembers (
  user_id uuid not null references public.profiles (id) on delete cascade,
  draw_id uuid not null references public.daily_draws (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, draw_id)
);

alter table public.questions enable row level security;
alter table public.question_votes enable row level security;
alter table public.remembers enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Going live
-- ---------------------------------------------------------------------------

create or replace function public.publish_due_cycles()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'utc')::date;
  published integer := 0;
begin
  -- Yesterday's human enters the Archive. Permanently (Article 1.9).
  update public.daily_draws
  set selection_status = 'completed'
  where selection_status = 'live'
    and selection_date < today;

  -- Today's human goes live, and only if a person approved the portrait.
  with due as (
    select d.id
    from public.daily_draws d
    join public.portraits p on p.draw_id = d.id
    where d.selection_date = today
      and d.selection_status = 'ready'
      and p.status = 'approved'
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

-- Moderation approval. Phase 9 builds the console; the transition belongs with
-- the data, so that "approved" can only ever mean a person said so.
create or replace function public.approve_portrait(target_portrait uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_draw uuid;
begin
  update public.portraits
  set status = 'approved', reviewed_at = now()
  where id = target_portrait
    and status in ('submitted', 'in_review')
  returning draw_id into target_draw;

  if target_draw is null then
    return false;
  end if;

  update public.daily_draws
  set selection_status = 'ready'
  where id = target_draw;

  return true;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname)
    from cron.job
    where jobname = 'onehuman-publish';

    -- A minute past midnight UTC, so the cycle boundary has certainly passed.
    perform cron.schedule(
      'onehuman-publish',
      '1 0 * * *',
      'select public.publish_due_cycles()'
    );
  end if;
exception
  when others then
    raise notice 'Could not schedule publication: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Reading today's human
-- ---------------------------------------------------------------------------
--
-- `profiles` and `portraits` stay owner-only. Publication does not open those
-- tables up — it exposes one carefully chosen row through a function, which is
-- the only thing a guest ever sees of another person.
--
-- Note what is absent from the return type: no surname, no email, no exact
-- birth date, no Remember count, and no user id.

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
    pr.city,
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
  where d.id = target_draw
    and p.status = 'approved'
    and d.selection_status in ('live', 'completed');
$$;

/*
 * Questions for a cycle, with their vote counts.
 *
 * The count is computed here rather than stored, because a stored counter is
 * a number somebody eventually decides to rank humans by. This one ranks
 * questions, which is the whole point of "Ask this".
 */
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
  group by q.id
  order by count(v.user_id) desc, q.created_at asc;
$$;

-- ---------------------------------------------------------------------------
-- 5. Taking part
-- ---------------------------------------------------------------------------
--
-- All four actions go through functions rather than table grants, because each
-- one has to check the cycle is live — a rule that belongs next to the data,
-- not in whichever client happens to be calling.

create or replace function public.ask_question(target_draw uuid, question_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_question uuid;
  asked_today integer;
begin
  if not exists (
    select 1 from public.daily_draws
    where id = target_draw and selection_status = 'live'
  ) then
    raise exception 'That cycle is not open for questions'
      using errcode = 'check_violation';
  end if;

  -- Rate limit (Article 8.5). Generous enough that nobody notices it, tight
  -- enough that one person cannot flood a single human's day.
  select count(*) into asked_today
  from public.questions
  where author_id = (select auth.uid())
    and draw_id = target_draw;

  if asked_today >= 5 then
    raise exception 'You have asked enough questions today'
      using errcode = 'check_violation';
  end if;

  insert into public.questions (draw_id, author_id, body)
  values (target_draw, (select auth.uid()), btrim(question_body))
  returning id into new_question;

  return new_question;
end;
$$;

create or replace function public.vote_question(target_question uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.questions q
    join public.daily_draws d on d.id = q.draw_id
    where q.id = target_question
      and q.status = 'approved'
      and d.selection_status = 'live'
  ) then
    return false;
  end if;

  insert into public.question_votes (question_id, user_id)
  values (target_question, (select auth.uid()))
  on conflict do nothing;

  return true;
end;
$$;

-- Undoing a vote, not opposing one. Removing your own row is the only other
-- thing a person can do here (Article 9.3).
create or replace function public.unvote_question(target_question uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.question_votes
  where question_id = target_question
    and user_id = (select auth.uid());

  return true;
end;
$$;

create or replace function public.remember_human(target_draw uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.daily_draws
    where id = target_draw
      and selection_status in ('live', 'completed')
  ) then
    return false;
  end if;

  insert into public.remembers (user_id, draw_id)
  values ((select auth.uid()), target_draw)
  on conflict do nothing;

  return true;
end;
$$;

create or replace function public.forget_human(target_draw uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.remembers
  where user_id = (select auth.uid())
    and draw_id = target_draw;

  return true;
end;
$$;

-- Whether *you* remember this human. There is deliberately no function that
-- answers how many people do (Article 9.4).
create or replace function public.do_i_remember(target_draw uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.remembers
    where user_id = (select auth.uid())
      and draw_id = target_draw
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. Privileges
-- ---------------------------------------------------------------------------

revoke all on public.questions from anon, authenticated;
revoke all on public.question_votes from anon, authenticated;
revoke all on public.remembers from anon, authenticated;

-- Your own rows, and nothing else. Everything public is served by a function.
grant select on public.questions to authenticated;
grant select on public.remembers to authenticated;

create policy questions_select_own
  on public.questions for select
  to authenticated
  using ((select auth.uid()) = author_id);

create policy remembers_select_own
  on public.remembers for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No policy on question_votes at all: who upvoted what is nobody's business,
-- including the asker's.

revoke execute on function public.publish_due_cycles()
  from public, anon, authenticated;
revoke execute on function public.approve_portrait(uuid)
  from public, anon, authenticated;

revoke execute on function public.ask_question(uuid, text) from public, anon;
revoke execute on function public.vote_question(uuid) from public, anon;
revoke execute on function public.unvote_question(uuid) from public, anon;
revoke execute on function public.remember_human(uuid) from public, anon;
revoke execute on function public.forget_human(uuid) from public, anon;
revoke execute on function public.do_i_remember(uuid) from public, anon;

grant execute on function public.ask_question(uuid, text) to authenticated;
grant execute on function public.vote_question(uuid) to authenticated;
grant execute on function public.unvote_question(uuid) to authenticated;
grant execute on function public.remember_human(uuid) to authenticated;
grant execute on function public.forget_human(uuid) to authenticated;
grant execute on function public.do_i_remember(uuid) to authenticated;

-- Article 6.1 — a guest reads everything. These three are the whole of what a
-- person can see without an account, and that is deliberate.
revoke execute on function public.get_todays_human() from public;
revoke execute on function public.get_portrait_elements(uuid) from public;
revoke execute on function public.get_questions(uuid) from public;

grant execute on function public.get_todays_human() to anon, authenticated;
grant execute on function public.get_portrait_elements(uuid) to anon, authenticated;
grant execute on function public.get_questions(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. The photograph
-- ---------------------------------------------------------------------------
--
-- The bucket stays private. Rather than copying files or handing out a service
-- key, the object becomes readable exactly when its cycle is live — so "not
-- before publication" is enforced by the same database that decides when
-- publication happened.

create policy storage_portraits_published_read
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'portraits'
    and exists (
      select 1
      from public.portraits p
      join public.daily_draws d on d.id = p.draw_id
      where p.photo_path = name
        and p.status = 'approved'
        and d.selection_status in ('live', 'completed')
    )
  );
