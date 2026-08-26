#!/usr/bin/env node

/**
 * Read-only, sanitized production database baseline.
 *
 * This script deliberately prints configuration metadata only: no table data,
 * user identifiers, object names, tokens, connection strings, or secret
 * values. It is safe to attach its output to release evidence.
 */

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
if (!process.env.CI || process.env.GITHUB_ACTIONS !== 'true') {
  console.error('Hosted baselines are CI-only after Phase 10.');
  process.exit(1);
}
const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = process.env.SUPABASE_PROJECT_REF;

if (!password || !projectRef || !/^[a-z0-9]{20}$/.test(projectRef)) {
  console.error(
    'Protected environment needs database password and project ref.'
  );
  process.exit(1);
}

const sql = String.raw`
with public_tables as (
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    count(pol.policyname)::integer as policy_count
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  left join pg_catalog.pg_policies pol
    on pol.schemaname = n.nspname and pol.tablename = c.relname
  where n.nspname = 'public' and c.relkind in ('r', 'p')
  group by c.relname, c.relrowsecurity
), client_grants as (
  select
    table_name,
    grantee,
    array_agg(privilege_type order by privilege_type) as privileges
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated', 'service_role')
  group by table_name, grantee
), public_policies as (
  select
    tablename as table_name,
    policyname as policy_name,
    cmd,
    roles
  from pg_catalog.pg_policies
  where schemaname = 'public'
), public_functions as (
  select
    p.proname as function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
    p.prosecdef as security_definer,
    p.provolatile as volatility
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
), function_grants as (
  select
    routine_name as function_name,
    grantee,
    array_agg(privilege_type order by privilege_type) as privileges
  from information_schema.routine_privileges
  where specific_schema = 'public'
    and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
  group by routine_name, grantee
), storage_policies as (
  select
    policyname as policy_name,
    cmd,
    roles
  from pg_catalog.pg_policies
  where schemaname = 'storage' and tablename = 'objects'
), extensions as (
  select extname, extversion
  from pg_catalog.pg_extension
  where extname in ('pg_cron', 'pg_net', 'pgcrypto', 'citext')
), migrations as (
  select version
  from supabase_migrations.schema_migrations
), cron_jobs as (
  select jobname, schedule, command, active
  from cron.job
), buckets as (
  select id, public, file_size_limit, allowed_mime_types
  from storage.buckets
), configured_job_secrets as (
  select replace(name, 'unumae_', '') as key
  from vault.secrets
  where name in ('unumae_functions_url', 'unumae_service_role_key')
)
select jsonb_build_object(
  'captured_at_utc', timezone('utc', now()),
  'project_ref', '${projectRef}',
  'database', jsonb_build_object(
    'server_version', current_setting('server_version'),
    'migration_count', (select count(*) from migrations),
    'latest_migration', (select max(version) from migrations),
    'extensions', coalesce((
      select jsonb_agg(to_jsonb(e) order by extname) from extensions e
    ), '[]'::jsonb)
  ),
  'public_tables', coalesce((
    select jsonb_agg(to_jsonb(t) order by table_name) from public_tables t
  ), '[]'::jsonb),
  'client_table_grants', coalesce((
    select jsonb_agg(to_jsonb(g) order by table_name, grantee) from client_grants g
  ), '[]'::jsonb),
  'public_policies', coalesce((
    select jsonb_agg(to_jsonb(p) order by table_name, policy_name) from public_policies p
  ), '[]'::jsonb),
  'public_functions', coalesce((
    select jsonb_agg(to_jsonb(f) order by function_name, arguments) from public_functions f
  ), '[]'::jsonb),
  'client_function_grants', coalesce((
    select jsonb_agg(to_jsonb(g) order by function_name, grantee) from function_grants g
  ), '[]'::jsonb),
  'storage', jsonb_build_object(
    'buckets', coalesce((
      select jsonb_agg(to_jsonb(b) order by id) from buckets b
    ), '[]'::jsonb),
    'object_policies', coalesce((
      select jsonb_agg(to_jsonb(p) order by policy_name) from storage_policies p
    ), '[]'::jsonb)
  ),
  'cron_jobs', coalesce((
    select jsonb_agg(to_jsonb(j) order by jobname) from cron_jobs j
  ), '[]'::jsonb),
  'configured_job_secret_names', coalesce((
    select jsonb_agg(key order by key) from configured_job_secrets
  ), '[]'::jsonb)
);
`;

const result = spawnSync(
  'psql',
  [
    '--host',
    `db.${projectRef}.supabase.co`,
    '--port',
    '5432',
    '--username',
    'postgres',
    '--dbname',
    'postgres',
    '--no-password',
    '--tuples-only',
    '--no-align',
    '--quiet',
    '--set',
    'ON_ERROR_STOP=1',
    '--command',
    sql,
  ],
  {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, PGPASSWORD: password },
  }
);

const redact = (value) => (value ?? '').split(password).join('<redacted>');

if (result.stdout) {
  const sanitized = redact(result.stdout).trim();
  try {
    const snapshot = JSON.parse(sanitized);
    const output = process.argv.includes('--full')
      ? snapshot
      : {
          captured_at_utc: snapshot.captured_at_utc,
          project_ref: snapshot.project_ref,
          database: snapshot.database,
          assurance: {
            public_table_count: snapshot.public_tables.length,
            all_public_tables_have_rls: snapshot.public_tables.every(
              (table) => table.rls_enabled
            ),
            public_tables_without_rls: snapshot.public_tables
              .filter((table) => !table.rls_enabled)
              .map((table) => table.table_name),
            public_policy_count: snapshot.public_policies.length,
            client_table_grant_count: snapshot.client_table_grants.length,
            public_function_count: snapshot.public_functions.length,
            security_definer_function_count: snapshot.public_functions.filter(
              (routine) => routine.security_definer
            ).length,
            client_function_grant_count: snapshot.client_function_grants.length,
          },
          storage: snapshot.storage,
          cron_jobs: snapshot.cron_jobs,
          configured_job_secret_names: snapshot.configured_job_secret_names,
        };
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } catch {
    process.stdout.write(`${sanitized}\n`);
  }
}
if (result.stderr) process.stderr.write(redact(result.stderr));

process.exit(result.status ?? 1);
