-- Phase 9 — trust & safety
--
-- Article 8.1 defines four layers, in order:
--
--   1  local validation           length, format, required fields
--   2  automated screening        structural signals, on submission
--   3  human review               every portrait, before it goes live
--   4  community reports          continuously
--
-- Layers 1 and 3 already exist. This migration builds 2 and 4, the record of
-- what moderators did, and the blocking that lets a person remove somebody
-- from their own view without waiting for anyone's decision.

-- ---------------------------------------------------------------------------
-- 1. Who may moderate
-- ---------------------------------------------------------------------------
--
-- A separate table rather than a column on profiles. Moderation authority is
-- not a property of a person's profile, and keeping it out of that table means
-- no client GRANT can ever accidentally expose or grant it.

create table public.moderators (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  note text
);

alter table public.moderators enable row level security;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.moderators m
    where m.user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Reports (Layer 4)
-- ---------------------------------------------------------------------------

create type public.report_target as enum ('portrait', 'question', 'profile');

create type public.report_reason as enum (
  'harassment',
  'hate',
  'sexual',
  'violence',
  'impersonation',
  'spam',
  'other'
);

create type public.report_status as enum ('open', 'actioned', 'dismissed');

create table public.content_reports (
  id uuid primary key default extensions.gen_random_uuid(),

  -- The reporter leaves with their account; the report survives as an event.
  reporter_id uuid references public.profiles (id) on delete set null,

  target_type public.report_target not null,
  target_id uuid not null,

  reason public.report_reason not null,
  note text,

  status public.report_status not null default 'open',
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,

  created_at timestamptz not null default now(),

  constraint content_reports_note_length
    check (note is null or char_length(note) <= 500),
  constraint content_reports_resolution_consistent
    check ((status = 'open') = (resolved_at is null))
);

create index idx_content_reports_open
  on public.content_reports (created_at)
  where status = 'open';

create index idx_content_reports_target
  on public.content_reports (target_type, target_id);

alter table public.content_reports enable row level security;

-- ---------------------------------------------------------------------------
-- 3. What moderators did (append-only)
-- ---------------------------------------------------------------------------
--
-- Moderation is a power exercised over people. A decision nobody can review
-- afterwards is a decision nobody can be held to, so this table is written to
-- and never updated or deleted — the same discipline as daily_draws.

create type public.moderation_action as enum (
  'auto_flagged',
  'portrait_approved',
  'portrait_rejected',
  'question_approved',
  'question_rejected',
  'report_actioned',
  'report_dismissed',
  'account_suspended',
  'account_banned',
  'account_reinstated',
  'archive_redacted'
);

create table public.moderation_events (
  id uuid primary key default extensions.gen_random_uuid(),

  -- Null for automated screening, which has no person behind it.
  actor_id uuid references public.profiles (id) on delete set null,

  action public.moderation_action not null,
  target_type public.report_target,
  target_id uuid,
  subject_id uuid references public.profiles (id) on delete set null,

  reason text,
  created_at timestamptz not null default now(),

  constraint moderation_events_reason_length
    check (reason is null or char_length(reason) <= 1000)
);

create index idx_moderation_events_subject
  on public.moderation_events (subject_id, created_at desc);

create index idx_moderation_events_target
  on public.moderation_events (target_type, target_id);

alter table public.moderation_events enable row level security;

/*
 * The current standing of one piece of content. moderation_events says what
 * happened and when; this says where it landed, so a screen does not have to
 * replay a log to find out.
 */
create type public.moderation_decision as enum ('approved', 'rejected');

create table public.moderation_decisions (
  target_type public.report_target not null,
  target_id uuid not null,
  decision public.moderation_decision not null,
  decided_by uuid references public.profiles (id) on delete set null,
  reason text,
  decided_at timestamptz not null default now(),
  primary key (target_type, target_id)
);

alter table public.moderation_decisions enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Blocking
-- ---------------------------------------------------------------------------
--
-- Article 8.3 removed direct messaging, so blocking is not about stopping
-- contact — it is about not having to read somebody. It takes effect
-- immediately and needs nobody's approval.

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

-- ---------------------------------------------------------------------------
-- 5. Flags on an account
-- ---------------------------------------------------------------------------

create type public.account_flag_kind as enum (
  'suspected_duplicate',
  'suspected_automation',
  'repeated_reports',
  'manual_watch'
);

create table public.account_flags (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.account_flag_kind not null,
  note text,
  created_at timestamptz not null default now(),
  cleared_at timestamptz
);

create index idx_account_flags_active
  on public.account_flags (user_id)
  where cleared_at is null;

alter table public.account_flags enable row level security;

-- ---------------------------------------------------------------------------
-- 6. Settings a moderator can turn on later
-- ---------------------------------------------------------------------------

create table public.app_settings (
  key text primary key,
  value boolean not null,
  note text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

insert into public.app_settings (key, value, note) values
  (
    'require_liveness_before_publication',
    false,
    'Article 8.5 requires a liveness check before publication. Off until a capture flow exists — turning it on now would make every cycle a Quiet Day. Turn on before public beta.'
  )
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 7. Layer 2 — automated screening
-- ---------------------------------------------------------------------------
--
-- Structural signals only: links, shouting, and repetition. Deliberately not a
-- word list. A list of forbidden words in a repository is a poor filter, ages
-- badly, and misfires on the people it is supposed to protect — semantic
-- screening belongs to a service that can be corrected without a deployment.
--
-- Nothing here rejects anything. It raises a flag so a human looks sooner.

create or replace function public.screen_text(body text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array_remove(array[
    case when body ~* '(https?://|www\.)' then 'contains_link' end,
    case
      when char_length(body) > 20
        and body = upper(body)
        and body ~ '[a-z]'  is not true
      then 'all_caps'
    end,
    case when body ~ '(.)\1{6,}' then 'repeated_characters' end,
    case when body ~* '@[a-z0-9_]{3,}' then 'mentions_handle' end
  ], null);
$$;

comment on function public.screen_text is
  'Layer 2 structural signals. Flags for review; never rejects (Article 8.1).';

create or replace function public.flag_question_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signals text[];
begin
  signals := public.screen_text(new.body);

  if array_length(signals, 1) > 0 then
    insert into public.moderation_events (
      actor_id, action, target_type, target_id, subject_id, reason
    ) values (
      null,
      'auto_flagged',
      'question',
      new.id,
      new.author_id,
      array_to_string(signals, ', ')
    );
  end if;

  return new;
end;
$$;

create trigger questions_auto_screen
  after insert on public.questions
  for each row execute function public.flag_question_on_insert();

-- ---------------------------------------------------------------------------
-- 8. What a user can do
-- ---------------------------------------------------------------------------

create or replace function public.report_content(
  report_target_type public.report_target,
  report_target_id uuid,
  report_reason public.report_reason,
  report_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_report uuid;
  recent integer;
begin
  -- Reporting is free and always available (Article 8.6 of the rules), but a
  -- report queue that one person can flood protects nobody.
  select count(*) into recent
  from public.content_reports
  where reporter_id = (select auth.uid())
    and created_at > now() - interval '1 hour';

  if recent >= 20 then
    raise exception 'Too many reports in a short time'
      using errcode = 'check_violation';
  end if;

  insert into public.content_reports (
    reporter_id, target_type, target_id, reason, note
  ) values (
    (select auth.uid()),
    report_target_type,
    report_target_id,
    report_reason,
    nullif(btrim(coalesce(report_note, '')), '')
  )
  returning id into new_report;

  return new_report;
end;
$$;

create or replace function public.block_user(target_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user = (select auth.uid()) then
    return false;
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values ((select auth.uid()), target_user)
  on conflict do nothing;

  return true;
end;
$$;

create or replace function public.unblock_user(target_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.user_blocks
  where blocker_id = (select auth.uid())
    and blocked_id = target_user;

  return true;
end;
$$;

/*
 * Everything we hold about the caller, as one JSON document (Article 8.2).
 *
 * Assembled with json_agg rather than counted or summarised: an export is the
 * data itself, not a report about it.
 */
create or replace function public.export_my_data()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'exported_at', now(),
    'profile', (
      select to_json(p) from public.profiles p
      where p.id = (select auth.uid())
    ),
    'questions', (
      select coalesce(json_agg(json_build_object(
        'body', q.body,
        'status', q.status,
        'answer', q.answer,
        'created_at', q.created_at
      )), '[]'::json)
      from public.questions q where q.author_id = (select auth.uid())
    ),
    'humans_i_remember', (
      select coalesce(json_agg(json_build_object(
        'selection_date', d.selection_date,
        'human_number', d.human_number
      )), '[]'::json)
      from public.remembers r
      join public.daily_draws d on d.id = r.draw_id
      where r.user_id = (select auth.uid())
    ),
    'invitations', (
      select coalesce(json_agg(json_build_object(
        'notified_at', i.notified_at,
        'acceptance_deadline', i.acceptance_deadline,
        'response', i.response
      )), '[]'::json)
      from public.draw_invitations i where i.user_id = (select auth.uid())
    ),
    'blocked_accounts', (
      select coalesce(json_agg(b.blocked_id), '[]'::json)
      from public.user_blocks b where b.blocker_id = (select auth.uid())
    ),
    'reports_i_made', (
      select coalesce(json_agg(json_build_object(
        'reason', c.reason,
        'status', c.status,
        'created_at', c.created_at
      )), '[]'::json)
      from public.content_reports c where c.reporter_id = (select auth.uid())
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 9. What a moderator can do
-- ---------------------------------------------------------------------------
--
-- Every one of these writes a moderation_events row. A decision that leaves no
-- trace is a decision nobody can be held to.

create or replace function public.review_portrait(
  target_portrait uuid,
  decision public.moderation_decision,
  review_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_draw uuid;
  subject uuid;
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  select p.draw_id, p.user_id into target_draw, subject
  from public.portraits p
  where p.id = target_portrait
    and p.status in ('submitted', 'in_review');

  if target_draw is null then
    return false;
  end if;

  if decision = 'approved' then
    update public.portraits
    set status = 'approved', reviewed_at = now()
    where id = target_portrait;

    update public.daily_draws
    set selection_status = 'ready'
    where id = target_draw;
  else
    update public.portraits
    set status = 'rejected', reviewed_at = now()
    where id = target_portrait;

    -- A rejected portrait leaves the cycle unfilled. The escalation path
    -- already knows what to do with that.
    update public.daily_draws
    set selection_status = 'replacement_required'
    where id = target_draw;
  end if;

  insert into public.moderation_decisions (
    target_type, target_id, decision, decided_by, reason
  ) values ('portrait', target_portrait, decision, (select auth.uid()), review_reason)
  on conflict (target_type, target_id) do update
    set decision = excluded.decision,
        decided_by = excluded.decided_by,
        reason = excluded.reason,
        decided_at = now();

  insert into public.moderation_events (
    actor_id, action, target_type, target_id, subject_id, reason
  ) values (
    (select auth.uid()),
    case when decision = 'approved' then 'portrait_approved' else 'portrait_rejected' end,
    'portrait',
    target_portrait,
    subject,
    review_reason
  );

  return true;
end;
$$;

create or replace function public.review_question(
  target_question uuid,
  decision public.moderation_decision,
  review_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  subject uuid;
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  update public.questions
  set status = case when decision = 'approved' then 'approved' else 'rejected' end
  where id = target_question
    and status = 'pending'
  returning author_id into subject;

  if subject is null then
    return false;
  end if;

  insert into public.moderation_events (
    actor_id, action, target_type, target_id, subject_id, reason
  ) values (
    (select auth.uid()),
    case when decision = 'approved' then 'question_approved' else 'question_rejected' end,
    'question',
    target_question,
    subject,
    review_reason
  );

  return true;
end;
$$;

create or replace function public.resolve_report(
  target_report uuid,
  actioned boolean,
  resolution_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  update public.content_reports
  set status = case when actioned then 'actioned' else 'dismissed' end,
      resolved_at = now(),
      resolved_by = (select auth.uid())
  where id = target_report
    and status = 'open';

  if not found then
    return false;
  end if;

  insert into public.moderation_events (
    actor_id, action, target_type, target_id, reason
  ) values (
    (select auth.uid()),
    case when actioned then 'report_actioned' else 'report_dismissed' end,
    'profile',
    target_report,
    resolution_note
  );

  return true;
end;
$$;

create or replace function public.set_account_status(
  target_user uuid,
  new_status public.account_status,
  status_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  update public.profiles
  set account_status = new_status,
      -- A suspended or banned account leaves the pool immediately. The nightly
      -- refresh would do it too, but not before tomorrow's freeze.
      selection_eligible = (new_status = 'active' and selection_eligible)
  where id = target_user;

  if not found then
    return false;
  end if;

  insert into public.moderation_events (
    actor_id, action, subject_id, reason
  ) values (
    (select auth.uid()),
    case new_status
      when 'suspended' then 'account_suspended'
      when 'banned' then 'account_banned'
      else 'account_reinstated'
    end,
    target_user,
    status_reason
  );

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. The queue
-- ---------------------------------------------------------------------------

create or replace function public.moderation_portrait_queue()
returns table (
  portrait_id uuid,
  draw_id uuid,
  selection_date date,
  display_name text,
  country_code char(2),
  photo_path text,
  submitted_at timestamptz,
  verification_level public.verification_level,
  open_reports integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.draw_id,
    d.selection_date,
    pr.display_name,
    pr.country_code,
    p.photo_path,
    p.submitted_at,
    pr.verification_level,
    (
      select count(*)::integer from public.content_reports c
      where c.target_type = 'portrait' and c.target_id = p.id and c.status = 'open'
    )
  from public.portraits p
  join public.daily_draws d on d.id = p.draw_id
  join public.profiles pr on pr.id = p.user_id
  where public.is_moderator()
    and p.status in ('submitted', 'in_review')
  order by d.selection_date asc, p.submitted_at asc;
$$;

create or replace function public.moderation_question_queue()
returns table (
  question_id uuid,
  draw_id uuid,
  body text,
  created_at timestamptz,
  auto_flags text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    q.id,
    q.draw_id,
    q.body,
    q.created_at,
    (
      select string_agg(e.reason, ', ')
      from public.moderation_events e
      where e.target_type = 'question'
        and e.target_id = q.id
        and e.action = 'auto_flagged'
    )
  from public.questions q
  where public.is_moderator()
    and q.status = 'pending'
  order by q.created_at asc;
$$;

create or replace function public.moderation_report_queue()
returns table (
  report_id uuid,
  target_type public.report_target,
  target_id uuid,
  reason public.report_reason,
  note text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.target_type, c.target_id, c.reason, c.note, c.created_at
  from public.content_reports c
  where public.is_moderator()
    and c.status = 'open'
  order by c.created_at asc;
$$;

-- ---------------------------------------------------------------------------
-- 11. Privileges
-- ---------------------------------------------------------------------------

revoke all on public.moderators from anon, authenticated;
revoke all on public.content_reports from anon, authenticated;
revoke all on public.moderation_events from anon, authenticated;
revoke all on public.moderation_decisions from anon, authenticated;
revoke all on public.user_blocks from anon, authenticated;
revoke all on public.account_flags from anon, authenticated;
revoke all on public.app_settings from anon, authenticated;

-- A person may see their own blocks and their own reports, and nothing else in
-- this file. Moderation records are reached only through functions.
grant select on public.user_blocks to authenticated;
grant select on public.content_reports to authenticated;

create policy user_blocks_select_own
  on public.user_blocks for select
  to authenticated
  using ((select auth.uid()) = blocker_id);

create policy content_reports_select_own
  on public.content_reports for select
  to authenticated
  using ((select auth.uid()) = reporter_id);

revoke execute on function public.screen_text(text) from public, anon, authenticated;
revoke execute on function public.flag_question_on_insert()
  from public, anon, authenticated;
revoke execute on function public.is_moderator() from public, anon;

revoke execute on function
  public.report_content(public.report_target, uuid, public.report_reason, text)
  from public, anon;
revoke execute on function public.block_user(uuid) from public, anon;
revoke execute on function public.unblock_user(uuid) from public, anon;
revoke execute on function public.export_my_data() from public, anon;

revoke execute on function
  public.review_portrait(uuid, public.moderation_decision, text) from public, anon;
revoke execute on function
  public.review_question(uuid, public.moderation_decision, text) from public, anon;
revoke execute on function public.resolve_report(uuid, boolean, text)
  from public, anon;
revoke execute on function
  public.set_account_status(uuid, public.account_status, text) from public, anon;
revoke execute on function public.moderation_portrait_queue() from public, anon;
revoke execute on function public.moderation_question_queue() from public, anon;
revoke execute on function public.moderation_report_queue() from public, anon;

grant execute on function public.is_moderator() to authenticated;
grant execute on function
  public.report_content(public.report_target, uuid, public.report_reason, text)
  to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.export_my_data() to authenticated;

-- Granted to every signed-in user, and refused inside the function unless the
-- caller is a moderator. The check lives with the data, so a missing GRANT can
-- never be the only thing standing between a user and a ban button.
grant execute on function
  public.review_portrait(uuid, public.moderation_decision, text) to authenticated;
grant execute on function
  public.review_question(uuid, public.moderation_decision, text) to authenticated;
grant execute on function public.resolve_report(uuid, boolean, text)
  to authenticated;
grant execute on function
  public.set_account_status(uuid, public.account_status, text) to authenticated;
grant execute on function public.moderation_portrait_queue() to authenticated;
grant execute on function public.moderation_question_queue() to authenticated;
grant execute on function public.moderation_report_queue() to authenticated;
