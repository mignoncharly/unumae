#!/usr/bin/env node
/**
 * Migration validation — part of `npm run verify`.
 *
 * This project runs no GitHub Actions. The pre-push hook runs `npm run verify`,
 * so these checks stand between a broken migration and the remote.
 *
 * Checks:
 *   1. Every file is named <14-digit timestamp>_<snake_case>.sql
 *   2. Timestamps are unique and strictly increasing by filename order
 *   3. No forbidden column from Article 7.2 is introduced
 *   4. Every created table enables row level security in the same migration
 *   5. No migration is edited in place after being applied (advisory: warns on
 *      files older than the newest one being modified more recently)
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');

const FORBIDDEN_COLUMNS = [
  'followers',
  'following',
  'popularity_score',
  'likes_received',
  'engagement_score',
  'reach',
];

const NAME_PATTERN = /^(\d{14})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/;

const errors = [];
const warnings = [];

if (!existsSync(MIGRATIONS_DIR)) {
  errors.push('supabase/migrations does not exist');
}

const files = existsSync(MIGRATIONS_DIR)
  ? readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort()
  : [];

const seenTimestamps = new Map();
let previousTimestamp = '';

for (const file of files) {
  const match = NAME_PATTERN.exec(file);
  if (!match) {
    errors.push(
      `${file}: name must be <14-digit timestamp>_<snake_case>.sql, e.g. 20260822000000_init.sql`
    );
    continue;
  }

  const [, timestamp] = match;

  if (seenTimestamps.has(timestamp)) {
    errors.push(
      `${file}: duplicate timestamp ${timestamp}, already used by ${seenTimestamps.get(timestamp)}`
    );
  }
  seenTimestamps.set(timestamp, file);

  if (timestamp <= previousTimestamp) {
    errors.push(
      `${file}: timestamp ${timestamp} is not after ${previousTimestamp}`
    );
  }
  previousTimestamp = timestamp;

  const source = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');

  // Comments may name a forbidden column in order to document the ban.
  const sql = source
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .toLowerCase();

  for (const column of FORBIDDEN_COLUMNS) {
    if (new RegExp(`\\b${column}\\b`).test(sql)) {
      errors.push(
        `${file}: introduces "${column}", forbidden by Product Constitution Article 7.2`
      );
    }
  }

  const created = [
    ...sql.matchAll(
      /create table(?: if not exists)?\s+(?:public\.)?"?(\w+)"?/g
    ),
  ].map((m) => m[1]);

  for (const table of created) {
    const rlsEnabled = new RegExp(
      `alter table\\s+(?:public\\.)?"?${table}"?\\s+enable row level security`
    ).test(sql);
    if (!rlsEnabled) {
      errors.push(
        `${file}: table "${table}" is created without "alter table ${table} enable row level security"`
      );
    }
  }
}

// Advisory: an already-applied migration edited after a later one exists is the
// classic way to desynchronise environments.
if (files.length > 1) {
  const newest = files.at(-1);
  const newestMtime = statSync(join(MIGRATIONS_DIR, newest)).mtimeMs;
  for (const file of files.slice(0, -1)) {
    if (statSync(join(MIGRATIONS_DIR, file)).mtimeMs > newestMtime) {
      warnings.push(
        `${file}: modified more recently than ${newest} — migrations are append-only once applied`
      );
    }
  }
}

for (const warning of warnings) {
  console.warn(`warn  ${warning}`);
}

if (errors.length > 0) {
  console.error('\nMigration validation failed:\n');
  for (const error of errors) {
    console.error(`  error  ${error}`);
  }
  console.error('');
  process.exit(1);
}

console.log(
  `Migrations OK — ${files.length} file(s), no forbidden columns, RLS enforced.`
);
