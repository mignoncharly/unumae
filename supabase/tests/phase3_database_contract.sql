begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select ok(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  ),
  'every public table and partition has RLS enabled'
);

select ok(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm', 'S')
      and has_table_privilege('public', c.oid, 'SELECT')
  ),
  'PUBLIC has no implicit table, view, or sequence access'
);

select ok(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and (
        has_table_privilege('anon', c.oid, 'INSERT')
        or has_table_privilege('anon', c.oid, 'UPDATE')
        or has_table_privilege('anon', c.oid, 'DELETE')
        or has_table_privilege('anon', c.oid, 'TRUNCATE')
      )
  ),
  'anonymous callers have no direct public-table mutation privileges'
);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.grantee in ('anon', 'authenticated')
      and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      and not exists (
        select 1
        from pg_policies p
        where p.schemaname = g.table_schema
          and p.tablename = g.table_name
          and p.cmd in ('ALL', g.privilege_type)
          and (
            'public' = any(p.roles)
            or g.grantee = any(p.roles)
          )
      )
  ),
  'every client table grant has a matching RLS policy for that role and command'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and has_function_privilege('public', p.oid, 'EXECUTE')
  ),
  'PUBLIC cannot execute any application function implicitly'
);

create temp table expected_anon_rpcs (name text primary key) on commit drop;
insert into expected_anon_rpcs (name) values
  ('country_representation'),
  ('draw_order'),
  ('draw_rank'),
  ('get_anniversaries'),
  ('get_archive'),
  ('get_archive_countries'),
  ('get_archive_page'),
  ('get_archive_years'),
  ('get_draw_commitment'),
  ('get_human'),
  ('get_portrait_elements'),
  ('get_portrait_translations'),
  ('get_question_translations'),
  ('get_questions'),
  ('get_random_human'),
  ('get_todays_human'),
  ('get_yesterdays_human'),
  ('is_published_portrait_object'),
  ('pool_hash'),
  ('selection_stats'),
  ('unnamed_countries'),
  ('year_zero_ends');

select ok(
  not exists (
    select distinct p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and has_function_privilege('anon', p.oid, 'EXECUTE')
      and not exists (
        select 1 from expected_anon_rpcs e where e.name = p.proname
      )
  ),
  'the complete anonymous RPC surface is explicitly allowlisted'
);

select ok(
  not exists (
    select 1
    from expected_anon_rpcs e
    where not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = e.name
        and has_function_privilege('anon', p.oid, 'EXECUTE')
    )
  ),
  'every intended anonymous RPC remains granted'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.prosecdef
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) setting
        where setting = 'search_path=""'
      )
  ),
  'every SECURITY DEFINER function pins an empty search_path'
);

select ok(
  not exists (
    select 1
    from pg_roles
    where rolname in ('anon', 'authenticated') and rolbypassrls
  ),
  'client roles cannot bypass RLS'
);

select ok(
  (select rolbypassrls from pg_roles where rolname = 'service_role'),
  'service role is the explicit RLS-bypassing worker boundary'
);

select is(
  has_table_privilege('anon', 'public.daily_draws', 'SELECT'),
  false,
  'anonymous users cannot select identity-bearing draw rows directly'
);

select is(
  has_table_privilege('authenticated', 'public.deletion_requests', 'SELECT'),
  false,
  'deletion worker state is not directly readable by clients'
);

select is(
  to_regclass('public.job_secrets'),
  null,
  'scheduler secrets are absent from the public schema'
);

select is(
  has_table_privilege('authenticated', 'public.moderation_events', 'SELECT'),
  false,
  'moderation audit records are not client-readable tables'
);

select is(
  has_function_privilege(
    'authenticated', 'public.claim_account_deletion_requests(integer)', 'EXECUTE'
  ),
  false,
  'authenticated users cannot claim deletion work'
);

select is(
  has_function_privilege(
    'authenticated', 'public.claim_storage_cleanup_jobs(integer)', 'EXECUTE'
  ),
  false,
  'authenticated users cannot claim storage cleanup work'
);

select is(
  has_function_privilege(
    'authenticated', 'public.claim_account_enforcement_jobs(integer)', 'EXECUTE'
  ),
  false,
  'authenticated users cannot claim account enforcement work'
);

select is(
  has_function_privilege(
    'authenticated', 'public.grant_moderator(text)', 'EXECUTE'
  ),
  false,
  'authenticated users cannot grant moderator authority'
);

select is(
  has_function_privilege(
    'service_role', 'public.claim_account_deletion_requests(integer)', 'EXECUTE'
  ),
  true,
  'service role can execute the deletion worker contract'
);

select is(
  has_function_privilege(
    'service_role', 'public.claim_storage_cleanup_jobs(integer)', 'EXECUTE'
  ),
  true,
  'service role can execute the storage worker contract'
);

select * from finish();
rollback;
