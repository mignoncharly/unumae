#!/usr/bin/env node

/**
 * Confirms that the hosted database migration history and Edge Function set
 * match this exact checkout. Only counts, names, statuses, and versions are
 * printed; no table data, credentials, or function payloads are emitted.
 */

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

if (!process.env.CI || process.env.GITHUB_ACTIONS !== 'true') {
  console.error('Hosted parity verification is CI-only.');
  process.exit(1);
}

const projectRef = process.env.SUPABASE_PROJECT_REF;
const password = process.env.SUPABASE_DB_PASSWORD;
if (!/^[a-z0-9]{20}$/.test(projectRef ?? '') || !password) {
  console.error(
    'Hosted parity verification needs the approved project ref and database password.'
  );
  process.exit(1);
}

const migrationPattern = /^(\d{14})_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;
const localMigrations = readdirSync(join(ROOT, 'supabase', 'migrations'))
  .map((filename) => filename.match(migrationPattern)?.[1])
  .filter(Boolean)
  .sort();

let connectionArgs = [
  '--host',
  `db.${projectRef}.supabase.co`,
  '--port',
  '5432',
  '--username',
  'postgres',
  '--dbname',
  'postgres',
];
const poolerUrl = process.env.SUPABASE_DB_POOLER_URL;
if (poolerUrl) {
  let parsed;
  try {
    parsed = new URL(poolerUrl);
  } catch {
    console.error('SUPABASE_DB_POOLER_URL is not a valid URL.');
    process.exit(1);
  }
  if (
    parsed.protocol !== 'postgresql:' ||
    !parsed.hostname.endsWith('.pooler.supabase.com') ||
    parsed.port !== '5432' ||
    parsed.username !== `postgres.${projectRef}` ||
    parsed.password ||
    parsed.pathname !== '/postgres'
  ) {
    console.error(
      'SUPABASE_DB_POOLER_URL is not the approved password-free pooler URL.'
    );
    process.exit(1);
  }
  connectionArgs = ['--dbname', poolerUrl];
}

const migrationQuery =
  "select coalesce(json_agg(version order by version), '[]'::json) from supabase_migrations.schema_migrations";
const migrationResult = spawnSync(
  'psql',
  [
    ...connectionArgs,
    '--no-password',
    '--tuples-only',
    '--no-align',
    '--quiet',
    '--set',
    'ON_ERROR_STOP=1',
    '--command',
    migrationQuery,
  ],
  {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, PGPASSWORD: password },
  }
);
if (migrationResult.status !== 0) {
  console.error('Could not read hosted migration history.');
  process.exit(1);
}

let remoteMigrations;
try {
  remoteMigrations = JSON.parse(migrationResult.stdout.trim());
} catch {
  console.error('Hosted migration history was not valid JSON.');
  process.exit(1);
}
if (
  !Array.isArray(remoteMigrations) ||
  remoteMigrations.some((version) => !/^\d{14}$/.test(String(version)))
) {
  console.error('Hosted migration history had an unexpected shape.');
  process.exit(1);
}
remoteMigrations = remoteMigrations.map(String).sort();

const same =
  localMigrations.length === remoteMigrations.length &&
  localMigrations.every(
    (version, index) => version === remoteMigrations[index]
  );
if (!same) {
  const missing = localMigrations.filter(
    (version) => !remoteMigrations.includes(version)
  );
  const extra = remoteMigrations.filter(
    (version) => !localMigrations.includes(version)
  );
  console.error(
    `Hosted migrations do not match this checkout. Missing remotely: ${missing.join(', ') || 'none'}; extra remotely: ${extra.join(', ') || 'none'}.`
  );
  process.exit(1);
}
console.log(
  `Migration parity passed: ${remoteMigrations.length} applied migration(s), latest ${remoteMigrations.at(-1) ?? 'none'}.`
);

const functionResult = spawnSync(
  'supabase',
  ['functions', 'list', '--project-ref', projectRef, '--output', 'json'],
  { cwd: ROOT, encoding: 'utf8', env: process.env }
);
if (functionResult.status !== 0) {
  console.error('Could not read the hosted Edge Function inventory.');
  process.exit(1);
}

let hostedFunctions;
try {
  hostedFunctions = JSON.parse(functionResult.stdout.trim());
} catch {
  console.error('Hosted Edge Function inventory was not valid JSON.');
  process.exit(1);
}
if (!Array.isArray(hostedFunctions)) {
  console.error('Hosted Edge Function inventory had an unexpected shape.');
  process.exit(1);
}

const localFunctions = readdirSync(join(ROOT, 'supabase', 'functions'), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory() && entry.name !== '_shared')
  .map((entry) => entry.name)
  .sort();
const hostedNames = hostedFunctions
  .map((fn) => fn.slug ?? fn.name ?? fn.function_name)
  .filter(Boolean)
  .sort();
const missingFunctions = localFunctions.filter(
  (name) => !hostedNames.includes(name)
);
const extraFunctions = hostedNames.filter(
  (name) => !localFunctions.includes(name)
);
const inactiveFunctions = hostedFunctions
  .filter((fn) => ['ACTIVE', 'active'].includes(fn.status) === false)
  .map((fn) => fn.slug ?? fn.name ?? fn.function_name)
  .filter(Boolean)
  .sort();

if (
  missingFunctions.length > 0 ||
  extraFunctions.length > 0 ||
  inactiveFunctions.length > 0 ||
  localFunctions.length !== hostedNames.length
) {
  console.error(
    `Hosted Edge Functions do not match. Missing: ${missingFunctions.join(', ') || 'none'}; extra: ${extraFunctions.join(', ') || 'none'}; inactive: ${inactiveFunctions.join(', ') || 'none'}.`
  );
  process.exit(1);
}

console.log(
  `Edge Function parity passed: ${hostedFunctions.length} repository function(s) deployed and ACTIVE.`
);
