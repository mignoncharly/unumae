-- Roadmap v2 Phase 4 — age enforcement and honest account assurance.
--
-- The database deliberately models claims separately. A confirmed contact is
-- not a provider identity, a provider identity is not a genuine device, and a
-- genuine device is not proof that a person is globally unique.

create type public.assurance_level as enum (
  'contact_pending',
  'contact_verified',
  'provider_verified',
  'device_attested',
  'reviewed'
);

create type public.attestation_platform as enum ('ios', 'android');
create type public.attestation_state as enum (
  'verified',
  'review_required',
  'revoked'
);
create type public.account_flag_review_decision as enum ('cleared', 'upheld');

alter table public.profiles
  add column assurance_level public.assurance_level
    not null default 'contact_pending',
  add column activity_requirement_met boolean not null default false,
  add column review_pending boolean not null default false;

comment on column public.profiles.assurance_level is
  'Strongest account/device claim actually established. Never a claim of human uniqueness.';
comment on column public.profiles.activity_requirement_met is
  'Server-computed explanation field. Eligibility recomputes the underlying activity rows.';
comment on column public.profiles.review_pending is
  'Server-computed explanation field. Active account flags remain authoritative.';

-- Option A: birth year only, conservatively old enough on January 1 UTC.
create or replace function public.enforce_min_account_age()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_utc_year integer := extract(
    year from (current_timestamp at time zone 'UTC')
  )::integer;
begin
  if new.birth_year > current_utc_year - 16 then
    raise exception 'Minimum age is 16 on January 1 UTC of the current year'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- -------------------------------------------------------------------------
-- Provider identities and normalized email addresses
-- -------------------------------------------------------------------------

create table public.provider_bindings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('apple', 'google')),
  provider_id text not null,
  bound_at timestamptz not null default now(),
  primary key (provider, provider_id),
  unique (user_id, provider)
);

create table public.disposable_email_domains (
  domain text primary key,
  source text not null default 'maintained-denylist',
  refreshed_at timestamptz not null default now(),
  constraint disposable_email_domain_ascii_lowercase check (
    domain = lower(domain)
    and domain ~ '^[a-z0-9.-]+$'
    and position('.' in domain) > 0
  )
);

insert into public.disposable_email_domains (domain) values
  ('10minutemail.com'),
  ('guerrillamail.com'),
  ('maildrop.cc'),
  ('mailinator.com'),
  ('temp-mail.org'),
  ('trashmail.com'),
  ('yopmail.com');

create or replace function public.normalize_assurance_email(raw_email text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cleaned text := lower(btrim(raw_email));
  local_part text;
  domain_part text;
begin
  if cleaned is null
     or cleaned !~ '^[\x20-\x7e]+$'
     or cleaned !~ '^[^@]+@[^@]+$' then
    raise exception 'Email address cannot be normalized safely'
      using errcode = 'check_violation';
  end if;

  local_part := split_part(cleaned, '@', 1);
  domain_part := split_part(cleaned, '@', 2);
  local_part := split_part(local_part, '+', 1);

  if domain_part = 'googlemail.com' then
    domain_part := 'gmail.com';
  end if;
  if domain_part = 'gmail.com' then
    local_part := replace(local_part, '.', '');
  end if;

  if local_part = '' or exists (
    select 1
    from public.disposable_email_domains d
    where d.domain = domain_part
  ) then
    raise exception 'Disposable or invalid email address is not eligible'
      using errcode = 'check_violation';
  end if;

  return local_part || '@' || domain_part;
end;
$$;

create table public.account_email_addresses (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  normalized_email text not null unique,
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.provider_bindings enable row level security;
alter table public.disposable_email_domains enable row level security;
alter table public.account_email_addresses enable row level security;

revoke all on public.provider_bindings from anon, authenticated;
revoke all on public.disposable_email_domains from anon, authenticated;
revoke all on public.account_email_addresses from anon, authenticated;

-- -------------------------------------------------------------------------
-- Attestation challenges, account keys, and reinstall-persistent flags
-- -------------------------------------------------------------------------

create table public.attestation_challenges (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform public.attestation_platform not null,
  challenge_hash bytea not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint attestation_challenge_lifetime check (
    expires_at > created_at and expires_at <= created_at + interval '10 minutes'
  ),
  constraint attestation_challenge_hash_length check (
    octet_length(challenge_hash) = 32
  )
);

create index idx_attestation_challenges_user
  on public.attestation_challenges (user_id, created_at desc);

-- `opaque_binding_hash` is HMACed by the Edge Function. No raw DeviceCheck
-- token, App Attest object, Play Integrity token, IP address, or push token is
-- stored here. The row intentionally survives account deletion.
create table public.device_binding_flags (
  id uuid primary key default extensions.gen_random_uuid(),
  platform public.attestation_platform not null,
  opaque_binding_hash bytea not null unique,
  pool_bound_at timestamptz,
  bound_account_id uuid references public.profiles (id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint device_binding_hash_length check (
    octet_length(opaque_binding_hash) = 32
  )
);

create table public.account_device_attestations (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_flag_id uuid not null references public.device_binding_flags (id),
  platform public.attestation_platform not null,
  key_id_hash bytea not null,
  public_key text,
  assertion_counter bigint not null default 0,
  state public.attestation_state not null default 'verified',
  attested_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  unique (platform, key_id_hash),
  unique (user_id, device_flag_id),
  constraint attestation_key_hash_length check (octet_length(key_id_hash) = 32),
  constraint attestation_counter_nonnegative check (assertion_counter >= 0),
  constraint attestation_public_key_bounded check (
    public_key is null or char_length(public_key) <= 4096
  )
);

alter table public.attestation_challenges enable row level security;
alter table public.device_binding_flags enable row level security;
alter table public.account_device_attestations enable row level security;

revoke all on public.attestation_challenges from anon, authenticated;
revoke all on public.device_binding_flags from anon, authenticated;
revoke all on public.account_device_attestations from anon, authenticated;

create or replace function public.create_attestation_challenge(
  target_user uuid,
  target_platform public.attestation_platform,
  target_hash bytea,
  target_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  challenge_id uuid;
begin
  if target_user is null or octet_length(target_hash) <> 32
     or target_expires_at <= now()
     or target_expires_at > now() + interval '10 minutes' then
    raise exception 'Invalid attestation challenge'
      using errcode = 'check_violation';
  end if;

  delete from public.attestation_challenges c
  where c.user_id = target_user
    and (c.expires_at < now() - interval '1 day' or c.consumed_at is not null);

  insert into public.attestation_challenges (
    user_id, platform, challenge_hash, expires_at
  ) values (
    target_user, target_platform, target_hash, target_expires_at
  ) returning id into challenge_id;

  return challenge_id;
end;
$$;

create or replace function public.consume_attestation_challenge(
  target_user uuid,
  target_challenge uuid,
  target_hash bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.attestation_challenges c
  set consumed_at = now()
  where c.id = target_challenge
    and c.user_id = target_user
    and c.challenge_hash = target_hash
    and c.consumed_at is null
    and c.expires_at >= now();
  return found;
end;
$$;

-- -------------------------------------------------------------------------
-- Review and privacy-preserving clustering signals
-- -------------------------------------------------------------------------

alter table public.account_flags
  add column signal_kind text,
  add column signal_hash bytea,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles (id) on delete set null;

create unique index idx_account_flags_unique_active_signal
  on public.account_flags (user_id, signal_kind, signal_hash)
  where cleared_at is null and signal_hash is not null;

create table public.account_flag_reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  flag_id uuid not null references public.account_flags (id) on delete cascade,
  decision public.account_flag_review_decision not null,
  reviewer_id uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  constraint account_flag_review_note_bounded check (
    note is null or char_length(note) <= 1000
  )
);

create table public.account_network_signals (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  network_hash bytea not null,
  asn integer,
  network_class text check (network_class in ('residential', 'vpn', 'datacenter', 'unknown')),
  observed_at timestamptz not null default now(),
  constraint account_network_hash_length check (octet_length(network_hash) = 32)
);

create index idx_account_network_cluster
  on public.account_network_signals (network_hash, observed_at desc);

alter table public.account_flag_reviews enable row level security;
alter table public.account_network_signals enable row level security;
revoke all on public.account_flag_reviews from anon, authenticated;
revoke all on public.account_network_signals from anon, authenticated;

create or replace function public.raise_account_signal(
  target_user uuid,
  target_signal text,
  target_hash bytea,
  target_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  flag_id uuid;
begin
  insert into public.account_flags (
    user_id, kind, note, signal_kind, signal_hash
  ) values (
    target_user,
    'suspected_duplicate',
    left(target_note, 1000),
    target_signal,
    target_hash
  )
  on conflict (user_id, signal_kind, signal_hash)
    where cleared_at is null and signal_hash is not null
  do update set note = excluded.note
  returning id into flag_id;
  return flag_id;
end;
$$;

create or replace function public.record_account_network_signal(
  target_user uuid,
  target_network_hash bytea,
  target_asn integer default null,
  target_class text default 'unknown'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  clustered_user uuid;
begin
  if octet_length(target_network_hash) <> 32
     or target_class not in ('residential', 'vpn', 'datacenter', 'unknown') then
    raise exception 'Invalid network signal' using errcode = 'check_violation';
  end if;

  insert into public.account_network_signals (
    user_id, network_hash, asn, network_class
  ) values (
    target_user, target_network_hash, target_asn, target_class
  );

  if target_class in ('vpn', 'datacenter') then
    perform public.raise_account_signal(
      target_user, 'network_' || target_class, target_network_hash,
      'Network classification requires manual review; no raw address retained.'
    );
  end if;

  if (
    select count(distinct s.user_id)
    from public.account_network_signals s
    where s.network_hash = target_network_hash
      and s.observed_at >= now() - interval '1 hour'
  ) > 1 then
    for clustered_user in
      select distinct s.user_id
      from public.account_network_signals s
      where s.network_hash = target_network_hash
        and s.observed_at >= now() - interval '1 hour'
    loop
      perform public.raise_account_signal(
        clustered_user, 'signup_network_cluster', target_network_hash,
        'Multiple accounts used one network in a short window; manual review required.'
      );
    end loop;
  end if;

  return true;
end;
$$;

-- -------------------------------------------------------------------------
-- Assurance synchronization and eligibility
-- -------------------------------------------------------------------------

create or replace function public.has_minimum_activity(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.questions q where q.author_id = target_user
    union all
    select 1 from public.question_votes v where v.user_id = target_user
    union all
    select 1 from public.remembers r where r.user_id = target_user
  );
$$;

create or replace function public.has_device_pool_assurance(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_device_attestations a
    join public.device_binding_flags d on d.id = a.device_flag_id
    where a.user_id = target_user
      and (
        (
          a.state = 'verified'
          and d.pool_bound_at is not null
          and (d.bound_account_id = target_user or d.bound_account_id is null)
        )
        or exists (
          select 1
          from public.account_flags f
          join public.account_flag_reviews r on r.flag_id = f.id
          where f.user_id = target_user
            and f.signal_kind = 'device_already_bound'
            and f.signal_hash = d.opaque_binding_hash
            and f.cleared_at is not null
            and r.decision = 'cleared'
        )
      )
  );
$$;

create or replace function public.recompute_account_assurance(target_user uuid)
returns public.assurance_level
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_level public.assurance_level;
  activity_met boolean;
  needs_review boolean;
begin
  if not exists (select 1 from public.profiles p where p.id = target_user) then
    return null;
  end if;

  activity_met := public.has_minimum_activity(target_user);
  needs_review := exists (
    select 1 from public.account_flags f
    where f.user_id = target_user and f.cleared_at is null
  );

  next_level := case
    when exists (
      select 1
      from public.account_flag_reviews r
      join public.account_flags f on f.id = r.flag_id
      where f.user_id = target_user and r.decision = 'cleared'
    ) and not needs_review then 'reviewed'::public.assurance_level
    when public.has_device_pool_assurance(target_user)
      then 'device_attested'::public.assurance_level
    when exists (
      select 1 from public.provider_bindings b where b.user_id = target_user
    ) then 'provider_verified'::public.assurance_level
    when exists (
      select 1 from public.account_email_addresses e
      where e.user_id = target_user and e.confirmed_at is not null
    ) then 'contact_verified'::public.assurance_level
    else 'contact_pending'::public.assurance_level
  end;

  update public.profiles p
  set assurance_level = next_level,
      activity_requirement_met = activity_met,
      review_pending = needs_review
  where p.id = target_user;

  return next_level;
end;
$$;

create or replace function public.sync_account_assurance(target_user uuid)
returns public.assurance_level
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_email text;
  email_confirmed timestamptz;
begin
  if not exists (select 1 from public.profiles p where p.id = target_user) then
    return null;
  end if;

  select u.email, u.email_confirmed_at
  into account_email, email_confirmed
  from auth.users u
  where u.id = target_user;

  if account_email is not null then
    insert into public.account_email_addresses (
      user_id, normalized_email, confirmed_at
    ) values (
      target_user,
      public.normalize_assurance_email(account_email),
      email_confirmed
    )
    on conflict (user_id) do update set
      normalized_email = excluded.normalized_email,
      confirmed_at = excluded.confirmed_at,
      updated_at = now();
  end if;

  insert into public.provider_bindings (user_id, provider, provider_id)
  select target_user, i.provider, i.provider_id
  from auth.identities i
  where i.user_id = target_user and i.provider in ('apple', 'google')
  on conflict (user_id, provider) do update
    set provider_id = excluded.provider_id;

  return public.recompute_account_assurance(target_user);
end;
$$;

create or replace function public.sync_profile_assurance_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_account_assurance(new.id);
  return new;
end;
$$;

create trigger profiles_sync_account_assurance
  after insert on public.profiles
  for each row execute function public.sync_profile_assurance_trigger();

create or replace function public.sync_auth_user_assurance_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_account_assurance(new.id);
  return new;
end;
$$;

create trigger auth_users_sync_account_assurance
  after update of email, email_confirmed_at on auth.users
  for each row execute function public.sync_auth_user_assurance_trigger();

create or replace function public.sync_auth_identity_assurance_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_account_assurance(new.user_id);
  return new;
end;
$$;

create trigger auth_identities_sync_account_assurance
  after insert or update of provider, provider_id on auth.identities
  for each row execute function public.sync_auth_identity_assurance_trigger();

create or replace function public.register_verified_device_attestation(
  target_user uuid,
  target_platform public.attestation_platform,
  target_binding_hash bytea,
  target_key_hash bytea,
  target_public_key text default null,
  provider_reports_bound boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  flag public.device_binding_flags;
  attestation_id uuid;
  conflict boolean;
begin
  if octet_length(target_binding_hash) <> 32
     or octet_length(target_key_hash) <> 32 then
    raise exception 'Invalid attestation binding' using errcode = 'check_violation';
  end if;

  insert into public.device_binding_flags (
    platform, opaque_binding_hash, last_seen_at
  ) values (
    target_platform, target_binding_hash, now()
  )
  on conflict (opaque_binding_hash) do update
    set last_seen_at = now()
  returning * into flag;

  conflict := not exists (
      select 1
      from public.account_flags cleared_flag
      join public.account_flag_reviews cleared_review
        on cleared_review.flag_id = cleared_flag.id
      where cleared_flag.user_id = target_user
        and cleared_flag.signal_kind = 'device_already_bound'
        and cleared_flag.signal_hash = target_binding_hash
        and cleared_flag.cleared_at is not null
        and cleared_review.decision = 'cleared'
    ) and ((
      provider_reports_bound
      and not exists (
        select 1
        from public.account_device_attestations existing
        where existing.user_id = target_user
          and existing.device_flag_id = flag.id
          and existing.state = 'verified'
      )
    ) or (flag.pool_bound_at is not null
      and flag.bound_account_id is distinct from target_user));

  insert into public.account_device_attestations (
    user_id,
    device_flag_id,
    platform,
    key_id_hash,
    public_key,
    state
  ) values (
    target_user,
    flag.id,
    target_platform,
    target_key_hash,
    target_public_key,
    case when conflict then 'review_required' else 'verified' end
      ::public.attestation_state
  )
  on conflict (user_id, device_flag_id) do update set
    key_id_hash = excluded.key_id_hash,
    public_key = excluded.public_key,
    state = excluded.state,
    last_verified_at = now()
  returning id into attestation_id;

  if conflict then
    perform public.raise_account_signal(
      target_user,
      'device_already_bound',
      target_binding_hash,
      'The platform reports this device was already bound to another pool account.'
    );
  end if;

  perform public.recompute_account_assurance(target_user);
  return attestation_id;
end;
$$;

create or replace function public.can_bind_device_to_pool(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.account_status = 'active'
    and p.created_at <= now() - interval '7 days'
    and p.accepted_rules_at is not null
    and p.birth_year <= extract(
      year from (current_timestamp at time zone 'UTC')
    )::integer - 16
    and public.has_minimum_activity(p.id)
    and exists (
      select 1 from public.provider_bindings b where b.user_id = p.id
    )
    and not exists (
      select 1 from public.account_flags f
      where f.user_id = p.id and f.cleared_at is null
    )
  from public.profiles p
  where p.id = target_user;
$$;

create or replace function public.bind_verified_device_to_pool(
  target_user uuid,
  target_binding_hash bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_flag uuid;
begin
  select d.id into target_flag
  from public.device_binding_flags d
  join public.account_device_attestations a on a.device_flag_id = d.id
  where d.opaque_binding_hash = target_binding_hash
    and a.user_id = target_user
    and a.state = 'verified'
    and d.pool_bound_at is null
  for update of d;

  if target_flag is null then
    return false;
  end if;

  update public.device_binding_flags d
  set pool_bound_at = now(), bound_account_id = target_user, last_seen_at = now()
  where d.id = target_flag and d.pool_bound_at is null;

  if not found then
    return false;
  end if;

  perform public.recompute_account_assurance(target_user);
  return true;
end;
$$;

create or replace function public.review_account_flag(
  target_flag uuid,
  target_decision public.account_flag_review_decision,
  review_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;
  if review_note is null or char_length(btrim(review_note)) < 10
     or char_length(review_note) > 1000 then
    raise exception 'A review note of 10 to 1000 characters is required'
      using errcode = 'check_violation';
  end if;

  select f.user_id into target_user
  from public.account_flags f
  where f.id = target_flag and f.cleared_at is null
  for update;

  if target_user is null then
    return false;
  end if;

  insert into public.account_flag_reviews (
    flag_id, decision, reviewer_id, note
  ) values (
    target_flag, target_decision, (select auth.uid()), btrim(review_note)
  );

  update public.account_flags f
  set reviewed_at = now(),
      reviewed_by = (select auth.uid()),
      cleared_at = case when target_decision = 'cleared' then now() else null end
  where f.id = target_flag;

  perform public.recompute_account_assurance(target_user);
  perform public.refresh_selection_eligibility();
  return true;
end;
$$;

create or replace function public.account_assurance_review_queue()
returns table (
  flag_id uuid,
  user_id uuid,
  display_name text,
  signal_kind text,
  review_context text,
  flagged_at timestamptz,
  review_due_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Not permitted' using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    f.id,
    f.user_id,
    p.display_name,
    f.signal_kind,
    f.note,
    f.created_at,
    f.created_at + interval '7 days'
  from public.account_flags f
  join public.profiles p on p.id = f.user_id
  where f.cleared_at is null and f.reviewed_at is null
  order by f.created_at, f.id;
end;
$$;

-- Operations replaces the complete denylist from a reviewed upstream file.
-- The transaction is all-or-nothing so a failed refresh cannot leave an empty
-- or partially parsed list behind.
create or replace function public.replace_disposable_email_domains(
  domains text[],
  source_name text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned text[];
  replaced integer;
begin
  select array_agg(distinct lower(btrim(value)) order by lower(btrim(value)))
  into cleaned
  from unnest(domains) value
  where btrim(value) <> '';

  if coalesce(array_length(cleaned, 1), 0) = 0
     or source_name is null or char_length(btrim(source_name)) not between 1 and 120
     or exists (
       select 1 from unnest(cleaned) domain
       where domain !~ '^[a-z0-9.-]+$' or position('.' in domain) = 0
     ) then
    raise exception 'Invalid disposable-domain refresh'
      using errcode = 'check_violation';
  end if;

  delete from public.disposable_email_domains;
  insert into public.disposable_email_domains (domain, source, refreshed_at)
  select domain, btrim(source_name), now() from unnest(cleaned) domain;
  get diagnostics replaced = row_count;
  return replaced;
end;
$$;

create or replace function public.refresh_selection_eligibility()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  perform public.recompute_account_assurance(p.id)
  from public.profiles p;

  with judged as (
    select p.id, (
      p.account_status = 'active'
      and p.created_at <= now() - interval '7 days'
      and p.accepted_rules_at is not null
      and p.birth_year <= extract(
        year from (current_timestamp at time zone 'UTC')
      )::integer - 16
      and public.has_minimum_activity(p.id)
      and exists (
        select 1 from public.provider_bindings b where b.user_id = p.id
      )
      and public.has_device_pool_assurance(p.id)
      and not exists (
        select 1 from public.account_flags f
        where f.user_id = p.id and f.cleared_at is null
      )
    ) as should_be_eligible
    from public.profiles p
  )
  update public.profiles p
  set selection_eligible = j.should_be_eligible
  from judged j
  where p.id = j.id
    and p.selection_eligible is distinct from j.should_be_eligible;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

create or replace function public.is_eligible(candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.account_status = 'active'
    and p.wants_selection = true
    and p.selection_eligible = true
    and p.created_at <= now() - interval '7 days'
    and p.accepted_rules_at is not null
    and p.birth_year <= extract(
      year from (current_timestamp at time zone 'UTC')
    )::integer - 16
    and public.has_minimum_activity(p.id)
    and exists (
      select 1 from public.provider_bindings b where b.user_id = p.id
    )
    and public.has_device_pool_assurance(p.id)
    and not exists (
      select 1 from public.account_flags f
      where f.user_id = p.id and f.cleared_at is null
    )
    and not exists (
      select 1 from public.daily_draws d
      where d.selected_user_id = p.id
        and d.selection_status <> 'cancelled'
    )
  from public.profiles p
  where p.id = candidate_id;
$$;

-- A push token moving between accounts is a review signal, never an automatic
-- permanent judgement. The raw token remains only in the notification table.
create or replace function public.register_push_token(
  push_token text,
  device_platform public.push_platform
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_user uuid;
  caller uuid := (select auth.uid());
  token_hash bytea;
begin
  perform public.assert_account_active();

  select t.user_id into previous_user
  from public.push_tokens t
  where t.token = push_token;

  if previous_user is distinct from caller and previous_user is not null then
    token_hash := extensions.digest(push_token, 'sha256');
    perform public.raise_account_signal(
      previous_user, 'shared_push_token', token_hash,
      'A push destination moved between accounts; manual review required.'
    );
    perform public.raise_account_signal(
      caller, 'shared_push_token', token_hash,
      'A push destination moved between accounts; manual review required.'
    );
  end if;

  insert into public.push_tokens (token, user_id, platform)
  values (push_token, caller, device_platform)
  on conflict (token) do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    last_seen_at = now();

  insert into public.notification_settings (user_id)
  values (caller)
  on conflict (user_id) do nothing;

  perform public.recompute_account_assurance(caller);
  if previous_user is not null then
    perform public.recompute_account_assurance(previous_user);
  end if;
  return true;
end;
$$;

-- Existing accounts are synchronized during deployment. Any normalization
-- collision aborts the migration instead of silently allowing two entries.
do $$
declare
  account_id uuid;
begin
  for account_id in select p.id from public.profiles p loop
    perform public.sync_account_assurance(account_id);
  end loop;
end;
$$;

-- Deletion removes provider/email/account-key material through CASCADE. The
-- device flag survives with its account link cleared by SET NULL.

-- Service-only mutation boundary.
revoke execute on function public.normalize_assurance_email(text)
  from public, anon, authenticated;
revoke execute on function public.has_minimum_activity(uuid)
  from public, anon, authenticated;
revoke execute on function public.has_device_pool_assurance(uuid)
  from public, anon, authenticated;
revoke execute on function public.create_attestation_challenge(
  uuid, public.attestation_platform, bytea, timestamptz
) from public, anon, authenticated;
revoke execute on function public.consume_attestation_challenge(uuid, uuid, bytea)
  from public, anon, authenticated;
revoke execute on function public.raise_account_signal(uuid, text, bytea, text)
  from public, anon, authenticated;
revoke execute on function public.record_account_network_signal(uuid, bytea, integer, text)
  from public, anon, authenticated;
revoke execute on function public.recompute_account_assurance(uuid)
  from public, anon, authenticated;
revoke execute on function public.sync_account_assurance(uuid)
  from public, anon, authenticated;
revoke execute on function public.register_verified_device_attestation(
  uuid, public.attestation_platform, bytea, bytea, text, boolean
) from public, anon, authenticated;
revoke execute on function public.bind_verified_device_to_pool(uuid, bytea)
  from public, anon, authenticated;
revoke execute on function public.can_bind_device_to_pool(uuid)
  from public, anon, authenticated;
revoke execute on function public.refresh_selection_eligibility()
  from public, anon, authenticated;
revoke execute on function public.replace_disposable_email_domains(text[], text)
  from public, anon, authenticated;
revoke execute on function public.sync_profile_assurance_trigger()
  from public, anon, authenticated;
revoke execute on function public.sync_auth_user_assurance_trigger()
  from public, anon, authenticated;
revoke execute on function public.sync_auth_identity_assurance_trigger()
  from public, anon, authenticated;

grant execute on function public.create_attestation_challenge(
  uuid, public.attestation_platform, bytea, timestamptz
) to service_role;
grant execute on function public.consume_attestation_challenge(uuid, uuid, bytea)
  to service_role;
grant execute on function public.record_account_network_signal(uuid, bytea, integer, text)
  to service_role;
grant execute on function public.sync_account_assurance(uuid) to service_role;
grant execute on function public.register_verified_device_attestation(
  uuid, public.attestation_platform, bytea, bytea, text, boolean
) to service_role;
grant execute on function public.bind_verified_device_to_pool(uuid, bytea)
  to service_role;
grant execute on function public.can_bind_device_to_pool(uuid) to service_role;
grant execute on function public.refresh_selection_eligibility() to service_role;
grant execute on function public.replace_disposable_email_domains(text[], text)
  to service_role;

revoke execute on function public.review_account_flag(
  uuid, public.account_flag_review_decision, text
) from public, anon;
grant execute on function public.review_account_flag(
  uuid, public.account_flag_review_decision, text
) to authenticated;
revoke execute on function public.account_assurance_review_queue()
  from public, anon;
grant execute on function public.account_assurance_review_queue()
  to authenticated;

-- Refresh before the pool precommit. Scheduling is best-effort locally, as in
-- earlier migrations where pg_cron may not be installed.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname)
    from cron.job where jobname = 'onehuman-refresh-eligibility';
    perform cron.schedule(
      'onehuman-refresh-eligibility',
      '45 23 * * *',
      'select public.refresh_selection_eligibility()'
    );
  end if;
exception when others then
  raise notice 'Could not reschedule eligibility refresh: %', sqlerrm;
end;
$$;

-- -------------------------------------------------------------------------
-- Publicly auditable draw precommit (commit-reveal fallback)
-- -------------------------------------------------------------------------
--
-- Ten minutes before the scheduled draw, the service freezes the exact pool
-- and commits to a CSPRNG seed without revealing it. The draw is not allowed
-- to recalculate either input. Once the cycle is public, get_draw_commitment
-- reveals the seed and all non-identifying verification inputs.

alter table public.daily_draws
  add column entropy_commitment text generated always as (
    encode(extensions.digest(random_seed, 'sha256'), 'hex')
  ) stored,
  add column randomness_source text not null default 'legacy_server_csprng_v0',
  add column algorithm_version text not null default 'hmac-sha256-v1',
  add column precommitted_at timestamptz;

alter table public.daily_draws
  alter column randomness_source set default 'emergency_server_csprng_v1';

alter table public.daily_draws
  add constraint daily_draws_randomness_source_bounded check (
    char_length(randomness_source) between 1 and 80
  ),
  add constraint daily_draws_algorithm_version_bounded check (
    char_length(algorithm_version) between 1 and 80
  );

create table public.draw_precommits (
  selection_date date primary key,
  candidate_pool_hash text not null,
  candidate_count integer not null,
  entropy_commitment text not null,
  secret_seed text not null,
  randomness_source text not null default 'commit_reveal_v1',
  algorithm_version text not null default 'hmac-sha256-v1',
  committed_at timestamptz not null default now(),
  constraint draw_precommits_pool_hash check (
    candidate_pool_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint draw_precommits_entropy_hash check (
    entropy_commitment ~ '^[0-9a-f]{64}$'
  ),
  constraint draw_precommits_seed_length check (char_length(secret_seed) = 64),
  constraint draw_precommits_candidate_count check (candidate_count >= 0)
);

create table public.draw_precommit_candidates (
  selection_date date not null references public.draw_precommits (selection_date),
  user_id uuid not null,
  primary key (selection_date, user_id)
);

alter table public.draw_precommits enable row level security;
alter table public.draw_precommit_candidates enable row level security;
revoke all on public.draw_precommits from anon, authenticated;
revoke all on public.draw_precommit_candidates from anon, authenticated;

create or replace function public.prevent_draw_precommit_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Draw precommits are append-only'
    using errcode = 'object_not_in_prerequisite_state';
end;
$$;

create trigger draw_precommits_append_only
before update or delete on public.draw_precommits
for each row execute function public.prevent_draw_precommit_mutation();

create trigger draw_precommit_candidates_append_only
before update or delete on public.draw_precommit_candidates
for each row execute function public.prevent_draw_precommit_mutation();

create or replace function public.precommit_daily_draw(target_date date)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  pool uuid[];
  pool_fingerprint text;
  seed text;
begin
  if target_date is null then
    raise exception 'A target date is required' using errcode = '22004';
  end if;

  if exists (
    select 1 from public.draw_precommits p
    where p.selection_date = target_date
  ) then
    raise exception 'A draw precommit already exists for %', target_date
      using errcode = 'unique_violation';
  end if;

  select coalesce(array_agg(p.id order by p.id), '{}'::uuid[])
  into pool
  from public.profiles p
  where public.is_eligible(p.id);

  pool_fingerprint := public.pool_hash(pool);
  seed := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.draw_precommits (
    selection_date,
    candidate_pool_hash,
    candidate_count,
    entropy_commitment,
    secret_seed
  ) values (
    target_date,
    pool_fingerprint,
    coalesce(array_length(pool, 1), 0),
    encode(extensions.digest(seed, 'sha256'), 'hex'),
    seed
  );

  insert into public.draw_precommit_candidates (selection_date, user_id)
  select target_date, unnest(pool);

  return target_date;
end;
$$;

create or replace function public.run_daily_draw(target_date date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  commitment public.draw_precommits;
  new_draw_id uuid;
  pool uuid[];
  ordered uuid[];
  next_version integer;
begin
  if exists (
    select 1 from public.daily_draws d
    where d.selection_date = target_date
      and d.selection_status <> 'cancelled'
  ) then
    raise exception 'A draw already exists for %', target_date
      using errcode = 'unique_violation';
  end if;

  select * into commitment
  from public.draw_precommits p
  where p.selection_date = target_date
  for update;

  if not found then
    raise exception 'No frozen precommit exists for %', target_date
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  select coalesce(array_agg(c.user_id order by c.user_id), '{}'::uuid[])
  into pool
  from public.draw_precommit_candidates c
  where c.selection_date = target_date;

  if public.pool_hash(pool) <> commitment.candidate_pool_hash
     or coalesce(array_length(pool, 1), 0) <> commitment.candidate_count
     or encode(extensions.digest(commitment.secret_seed, 'sha256'), 'hex')
        <> commitment.entropy_commitment then
    raise exception 'The frozen draw commitment does not verify'
      using errcode = 'data_corrupted';
  end if;

  if exists (
    select 1 from unnest(pool) candidate
    where not exists (select 1 from public.profiles p where p.id = candidate)
  ) then
    raise exception 'A frozen candidate was deleted before the draw'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  ordered := public.draw_order(commitment.secret_seed, pool);

  select coalesce(max(d.draw_version), 0) + 1 into next_version
  from public.daily_draws d where d.selection_date = target_date;

  insert into public.daily_draws (
    selection_date, draw_version, candidate_pool_hash, candidate_count,
    random_seed, selected_user_id, backup_1, backup_2, backup_3,
    selection_status, randomness_source, algorithm_version, precommitted_at
  ) values (
    target_date, next_version, commitment.candidate_pool_hash,
    commitment.candidate_count, commitment.secret_seed, ordered[1],
    ordered[2], ordered[3], ordered[4],
    (case when ordered[1] is null then 'cancelled' else 'selected' end)
      ::public.selection_status,
    commitment.randomness_source, commitment.algorithm_version,
    commitment.committed_at
  ) returning id into new_draw_id;

  insert into public.draw_candidates (draw_id, user_id)
  select new_draw_id, unnest(pool);

  return new_draw_id;
end;
$$;

create or replace function public.get_draw_commitment(target_date date)
returns table (
  selection_date date,
  candidate_pool_hash text,
  candidate_count integer,
  entropy_commitment text,
  randomness_source text,
  algorithm_version text,
  committed_at timestamptz,
  revealed_seed text,
  revealed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.selection_date,
    p.candidate_pool_hash,
    p.candidate_count,
    p.entropy_commitment,
    p.randomness_source,
    p.algorithm_version,
    p.committed_at,
    case when d.selection_status in ('live', 'completed', 'cancelled')
      then p.secret_seed else null end,
    case when d.selection_status in ('live', 'completed', 'cancelled')
      then coalesce(d.published_at, d.created_at) else null end
  from public.draw_precommits p
  left join lateral (
    select x.selection_status, x.published_at, x.created_at
    from public.daily_draws x
    where x.selection_date = p.selection_date
    order by x.draw_version desc limit 1
  ) d on true
  where p.selection_date = target_date;
$$;

create or replace function public.precommit_daily_draw_job()
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_date date := (now() at time zone 'utc')::date + 2;
  committed_date date;
begin
  committed_date := public.precommit_daily_draw(target_date);
  insert into public.job_runs (job, ok, status, detail, completed_at)
  values (
    'draw-precommit', true, 'succeeded',
    'Committed draw inputs for ' || committed_date::text, now()
  );
  return committed_date;
exception when others then
  insert into public.job_runs (job, ok, status, detail, completed_at)
  values ('draw-precommit', false, 'failed', left(sqlerrm, 1000), now());
  return null;
end;
$$;

revoke execute on function public.prevent_draw_precommit_mutation()
  from public, anon, authenticated;
revoke execute on function public.precommit_daily_draw(date)
  from public, anon, authenticated;
revoke execute on function public.precommit_daily_draw_job()
  from public, anon, authenticated;
revoke execute on function public.run_daily_draw(date)
  from public, anon, authenticated;
revoke execute on function public.get_draw_commitment(date)
  from public, anon, authenticated;
grant execute on function public.precommit_daily_draw(date) to service_role;
grant execute on function public.get_draw_commitment(date)
  to anon, authenticated;

-- Existing column grants are not widened automatically by ALTER TABLE.
grant select (
  entropy_commitment,
  randomness_source,
  algorithm_version,
  precommitted_at
) on public.daily_draws to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname)
    from cron.job where jobname = 'onehuman-draw-precommit';
    perform cron.schedule(
      'onehuman-draw-precommit',
      '50 23 * * *',
      'select public.precommit_daily_draw_job()'
    );
  end if;
exception when others then
  raise notice 'Could not schedule draw precommit: %', sqlerrm;
end;
$$;
