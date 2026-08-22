#!/usr/bin/env node
/**
 * Probes what an anonymous caller can execute, against an explicit allowlist.
 *
 *   npm run verify:privileges
 *
 * This exists because of a real hole. Postgres grants EXECUTE on new functions
 * to PUBLIC, and Supabase additionally grants it to `anon` and `authenticated`
 * by default — so a `security definer` function is world-callable the moment it
 * is created, and `revoke ... from anon` in one migration does nothing for the
 * function added in the next one.
 *
 * Reviewing migrations did not catch that. Asking the live database did.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/**
 * The only functions an anonymous caller may execute. Everything else must
 * answer 401.
 *
 * These three are the public verification surface (Article 12): pure functions
 * over values the caller already holds, reading no table and revealing nothing
 * about anyone.
 */
const ANON_ALLOWED = new Set(['draw_rank', 'draw_order', 'pool_hash']);

const PROBES = [
  ['run_daily_draw', { target_date: '2027-01-01' }],
  ['escalate_draw', { target_date: '2027-01-01' }],
  ['notify_selected_candidate', { target_date: '2027-01-01' }],
  ['expire_stale_invitations', {}],
  ['accept_selection', {}],
  ['decline_selection', {}],
  ['my_pending_invitation', {}],
  ['is_eligible', { candidate_id: '00000000-0000-0000-0000-000000000001' }],
  ['has_been_selected', {}],
  ['scheduler_installed', {}],
  ['draw_order', { seed: 's', ids: [] }],
  [
    'draw_rank',
    { seed: 's', candidate: '00000000-0000-0000-0000-000000000001' },
  ],
  ['pool_hash', { ids: [] }],
];

/** Tables no anonymous caller may read a single row of. */
const CLOSED_TABLES = ['profiles', 'draw_candidates', 'draw_invitations'];

function loadEnv() {
  const path = join(ROOT, '.env');
  if (!existsSync(path)) {
    console.error('No .env — copy .env.example and fill it in.');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('.env is missing EXPO_PUBLIC_SUPABASE_URL or ANON_KEY.');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

let failures = 0;

function report(ok, label, detail = '') {
  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`
  );
  if (!ok) failures += 1;
}

console.log(`Probing anonymous access to ${url}\n`);
console.log('functions');

for (const [name, body] of PROBES) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const allowed = ANON_ALLOWED.has(name);
  const reachable = response.status !== 401 && response.status !== 404;

  report(
    allowed === reachable,
    `${name} ${allowed ? 'open (intended)' : 'closed'}`,
    allowed === reachable ? '' : `HTTP ${response.status}`
  );
}

console.log('\ntables');

for (const table of CLOSED_TABLES) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers,
  });
  report(
    response.status === 401 || response.status === 403,
    `${table} closed`,
    response.status === 401 || response.status === 403
      ? ''
      : `HTTP ${response.status}`
  );
}

// daily_draws is readable, but only its transparency columns and only for
// cycles that have gone live.
console.log('\ndaily_draws column exposure');

const forbidden = await fetch(
  `${url}/rest/v1/daily_draws?select=selected_user_id&limit=1`,
  { headers }
);
report(
  forbidden.status === 401 || forbidden.status === 403,
  'selected_user_id not readable',
  forbidden.status === 401 || forbidden.status === 403
    ? ''
    : `HTTP ${forbidden.status}`
);

const allowedColumns = await fetch(
  `${url}/rest/v1/daily_draws?select=selection_date,candidate_pool_hash,random_seed&limit=1`,
  { headers }
);
report(
  allowedColumns.ok,
  'transparency columns readable',
  allowedColumns.ok ? '' : `HTTP ${allowedColumns.status}`
);

console.log(
  failures === 0
    ? '\nAnonymous access matches the allowlist.'
    : `\n${failures} function(s) or table(s) exposed. Fix before deploying.`
);

process.exit(failures === 0 ? 0 : 1);
